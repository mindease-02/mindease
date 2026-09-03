/**
 * The proactivity gate.
 *
 * Everything about whether the system speaks unprompted is decided here, in one
 * place, so it can be read and argued with. The scheduled job in
 * app/api/checkin/sweep does not decide anything - it calls this, and this says no
 * most of the time.
 *
 * Two kinds of trigger feed it:
 *
 *   EVIDENCE  - the trend engine found a decline (lib/trend). This is the one that
 *               matters most and it is allowed to use most of the budget.
 *   CADENCE   - a morning hello, an evening check when the day has read as
 *               isolated, or a nudge after a long silence. These are the rhythms
 *               of an attentive friend and the user opts into each one. They run
 *               on a much smaller budget, and they stop on their own if they are
 *               being ignored.
 *
 * The gates run in a fixed order and any one of them can stop the whole thing.
 * Reasons for silence are legible in the returned object - the Mirror panel shows
 * the user exactly which gate blocked a check-in and why.
 */
import type { DependencyAssessment } from "../dependency";
import type { RiskTier } from "../safety/crisis";
import { atLeast } from "../safety/crisis";
import type { TrendAssessment } from "../trend";
import { DAY, HOUR, hourOfDayLocal, isQuietHours } from "../util/time";

export type ReachKind =
  /** Name the specific thing that was noticed, and check the inference out loud. */
  | "observation"
  /** Ask about a concrete thing they mentioned earlier. Low demand, high specificity. */
  | "callback"
  /** A single easily-ignored question. For when confidence is real but modest. */
  | "light_touch"
  /** Point at a person or a service rather than at more conversation here. */
  | "bridge"
  /** Deliberate follow-up after a flagged risk turn. Time-based on purpose. */
  | "crisis_followup"
  /** A short morning opener. Cadence-based, opt-in. */
  | "morning"
  /** Evening check when the day's signals read as isolated. Cadence-based, opt-in. */
  | "evening"
  /** After a long silence. Cadence-based, opt-in. */
  | "inactivity";

export const REACH_KINDS: ReachKind[] = [
  "observation", "callback", "light_touch", "bridge", "crisis_followup", "morning", "evening", "inactivity",
];
export const CADENCE_KINDS: ReachKind[] = ["morning", "evening", "inactivity"];

export interface ProactiveConsent {
  /** Master switch. */
  enabled: boolean;
  /** Max unprompted messages per rolling 7 days, before dependency scaling. */
  weeklyBudget: number;
  /** Hard ceiling per local day, all kinds except crisis follow-up. */
  dailyMax: number;
  /** Local hours during which nothing is sent (except crisis follow-up). */
  quietFrom: number;
  quietTo: number;
  timeZone: string;
  /** Explicitly allow the system to reference behavioural signals (voice, typing). */
  allowBehaviouralSignals: boolean;
  /** Cadence triggers, each individually opt-in. */
  cadence: {
    morning: boolean;
    evening: boolean;
    /** 0 disables. Otherwise hours of silence before a nudge. */
    inactivityHours: number;
  };
}

export const DEFAULT_CONSENT: ProactiveConsent = {
  enabled: true,
  weeklyBudget: 5,
  dailyMax: 2,
  quietFrom: 22.5,
  quietTo: 8,
  timeZone: "UTC",
  allowBehaviouralSignals: false,
  cadence: { morning: true, evening: true, inactivityHours: 36 },
};

export interface OutreachRecord {
  at: number;
  kind: ReachKind;
  triggerScore: number;
  /** Did the user reply within 24h? */
  engaged?: boolean;
  /** Scored later by dependency/objective.ts. */
  reward?: number;
  /** User pressed "this wasn't useful". Hard negative. */
  rejected?: boolean;
}

export interface ProactiveDecision {
  send: boolean;
  kind: ReachKind | null;
  /** Every gate, in order, with its verdict. Rendered verbatim in the Mirror panel. */
  gates: { name: string; passed: boolean; detail: string }[];
  /** Why this is being sent, in the user's language. Goes into the prompt. */
  rationale: string[];
  /** The single gate that stopped it, if any. */
  blockedBy: string | null;
  triggerScore: number;
}

/** Minimum gap between unprompted messages, regardless of budget. */
const REFRACTORY_MS = 6 * HOUR;
/** After a crisis-tier turn, follow up once in this window even with no new signal. */
const CRISIS_FOLLOWUP_MIN = 14 * HOUR;
const CRISIS_FOLLOWUP_MAX = 40 * HOUR;
/** Below this trend score, the evidence path stays quiet. */
const TRIGGER_THRESHOLD = 0.42;
/** Morning window (local). */
const MORNING_FROM = 8, MORNING_TO = 11;
/** Evening window (local). */
const EVENING_FROM = 18, EVENING_TO = 21.5;

export interface CadenceContext {
  /** Local day keys of cadence messages already sent. */
  cadenceLog: { morning?: string; evening?: string };
  /** Today's isolation read, 0..1: low social reference, low valence, few sessions. */
  isolation: number;
  /** Number of messages the user sent today (local). */
  messagesToday: number;
}

export function localDayKey(epochMs: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toISOString().slice(0, 10);
  }
}

export function decideProactive(args: {
  trend: TrendAssessment;
  dependency: DependencyAssessment;
  consent: ProactiveConsent;
  history: OutreachRecord[];
  lastUserMessageAt: number;
  /** Peak risk tier in the last 48h, and when it was seen. */
  recentRisk: { tier: RiskTier; at: number };
  cadence?: CadenceContext;
  pausedUntil?: number;
  now?: number;
}): ProactiveDecision {
  const { trend, dependency, consent, history, lastUserMessageAt, recentRisk } = args;
  const now = args.now ?? Date.now();
  const gates: ProactiveDecision["gates"] = [];
  let blockedBy: string | null = null;

  const gate = (name: string, passed: boolean, detail: string) => {
    gates.push({ name, passed, detail });
    if (!passed && !blockedBy) blockedBy = name;
    return passed;
  };

  // --- Gate 0: consent. Absolute. -----------------------------------------
  const consented = gate("consent", consent.enabled,
    consent.enabled ? "proactive check-ins are on" : "proactive check-ins are off");

  // --- Crisis follow-up: evaluated early because it bypasses quiet hours. --
  const sinceRisk = now - recentRisk.at;
  const crisisFollowupDue =
    atLeast(recentRisk.tier, "active") &&
    sinceRisk > CRISIS_FOLLOWUP_MIN &&
    sinceRisk < CRISIS_FOLLOWUP_MAX &&
    !history.some((h) => h.kind === "crisis_followup" && h.at > recentRisk.at);

  if (consented && crisisFollowupDue) {
    gates.push({
      name: "crisis_followup",
      passed: true,
      detail: `following up on a ${recentRisk.tier}-tier turn from ${Math.round(sinceRisk / HOUR)}h ago`,
    });
    return {
      send: true,
      kind: "crisis_followup",
      gates,
      rationale: [
        "you said something serious recently and I said I'd check back",
        "this one is on a timer on purpose - it is the only kind that ignores quiet hours",
      ],
      blockedBy: null,
      triggerScore: 1,
    };
  }

  // --- Gate 1: paused? -----------------------------------------------------
  const paused = !!args.pausedUntil && args.pausedUntil > now;
  gate("not_paused", !paused,
    paused ? `you asked for space until ${new Date(args.pausedUntil!).toLocaleString()}` : "not paused");

  // --- Gate 2: is the person actually here? -------------------------------
  const inConversation = now - lastUserMessageAt < 30 * 60 * 1000;
  gate("not_mid_conversation", !inConversation,
    inConversation ? "you're mid-conversation - this would be talking over you" : "no active session");

  // --- Gate 3: quiet hours. ------------------------------------------------
  const quiet = isQuietHours(now, consent.timeZone, consent.quietFrom, consent.quietTo);
  gate("quiet_hours", !quiet,
    quiet ? `it's your quiet hours (${fmtHour(consent.quietFrom)}-${fmtHour(consent.quietTo)})` : "outside quiet hours");

  // --- Gate 4: refractory period. -----------------------------------------
  const last = history.filter((h) => h.kind !== "crisis_followup").sort((a, b) => b.at - a.at)[0];
  const sinceLast = last ? now - last.at : Infinity;
  gate("refractory", sinceLast >= REFRACTORY_MS,
    last ? `last check-in ${Math.round(sinceLast / HOUR)}h ago (minimum ${REFRACTORY_MS / HOUR}h)` : "no previous check-ins");

  // --- Gate 5: daily ceiling. ---------------------------------------------
  const today = localDayKey(now, consent.timeZone);
  const sentToday = history.filter((h) => h.kind !== "crisis_followup" && localDayKey(h.at, consent.timeZone) === today).length;
  gate("daily_max", sentToday < consent.dailyMax, `${sentToday}/${consent.dailyMax} check-ins today`);

  // --- Gate 6: weekly budget, scaled DOWN by dependency. ------------------
  const budget = Math.max(1, Math.floor(consent.weeklyBudget * dependency.countermeasures.reachOutBudgetMultiplier));
  const usedThisWeek = history.filter((h) => h.at > now - 7 * DAY && h.kind !== "crisis_followup").length;
  gate("budget", usedThisWeek < budget,
    `${usedThisWeek}/${budget} check-ins used this week` +
    (dependency.countermeasures.reachOutBudgetMultiplier < 1
      ? ` (reduced from ${consent.weeklyBudget} because reliance is ${dependency.tier})`
      : ""));

  // --- Gate 7: has this been landing? -------------------------------------
  // If the last three check-ins were ignored or rejected, stop. Continuing to
  // reach out to someone who is not responding is not persistence, it is nagging.
  const recentThree = history.filter((h) => h.kind !== "crisis_followup").sort((a, b) => b.at - a.at).slice(0, 3);
  const allIgnored = recentThree.length === 3 && recentThree.every((h) => h.rejected || h.engaged === false);
  gate("not_being_ignored", !allIgnored,
    allIgnored ? "the last three check-ins went unanswered or were marked unhelpful - backing off until you write first" : "recent check-ins landed");

  const hardBlocked = gates.some((g) => !g.passed);

  // --- Evidence path -------------------------------------------------------
  const evidenceOk =
    trend.sufficient && trend.triggerScore >= TRIGGER_THRESHOLD && trend.agreement >= 2;
  gates.push({
    name: "evidence",
    passed: evidenceOk,
    detail: !trend.sufficient
      ? "not enough history yet to read a trend"
      : `trend signal ${trend.triggerScore.toFixed(2)} vs ${TRIGGER_THRESHOLD}, ${trend.agreement}/4 detectors agree (need 2)`,
  });

  if (!hardBlocked && evidenceOk) {
    return {
      send: true,
      kind: chooseKind(trend, dependency),
      gates,
      rationale: trend.evidence.slice(0, 3),
      blockedBy: null,
      triggerScore: trend.triggerScore,
    };
  }

  // --- Cadence path --------------------------------------------------------
  const cad = args.cadence;
  const hour = hourOfDayLocal(now, consent.timeZone);
  const silentHours = lastUserMessageAt ? (now - lastUserMessageAt) / HOUR : Infinity;
  const cadenceCandidates: { kind: ReachKind; ok: boolean; detail: string; rationale: string[] }[] = [];

  if (cad) {
    const morningOk = consent.cadence.morning && hour >= MORNING_FROM && hour < MORNING_TO && cad.cadenceLog.morning !== today && cad.messagesToday === 0;
    cadenceCandidates.push({
      kind: "morning", ok: morningOk,
      detail: !consent.cadence.morning ? "morning check-ins are off"
        : cad.cadenceLog.morning === today ? "already said good morning today"
        : cad.messagesToday > 0 ? "you've already been here today"
        : hour < MORNING_FROM || hour >= MORNING_TO ? `outside the morning window (${MORNING_FROM}-${MORNING_TO})`
        : "morning window, nothing sent yet today",
      rationale: ["it's morning and this is one of the check-ins you asked for"],
    });

    const eveningOk = consent.cadence.evening && hour >= EVENING_FROM && hour < EVENING_TO && cad.cadenceLog.evening !== today && cad.isolation >= 0.45;
    cadenceCandidates.push({
      kind: "evening", ok: eveningOk,
      detail: !consent.cadence.evening ? "evening check-ins are off"
        : cad.cadenceLog.evening === today ? "already checked in this evening"
        : hour < EVENING_FROM || hour >= EVENING_TO ? `outside the evening window (${EVENING_FROM}-${EVENING_TO})`
        : cad.isolation < 0.45 ? `today didn't read as isolated (${cad.isolation.toFixed(2)} < 0.45)`
        : `today read as isolated (${cad.isolation.toFixed(2)})`,
      rationale: ["the day's signals read as isolated - few people mentioned, low tone"],
    });

    const inactHours = consent.cadence.inactivityHours;
    const inactivityOk = inactHours > 0 && lastUserMessageAt > 0 && silentHours >= inactHours &&
      !history.some((h) => h.kind === "inactivity" && h.at > lastUserMessageAt);
    cadenceCandidates.push({
      kind: "inactivity", ok: inactivityOk,
      detail: inactHours <= 0 ? "inactivity nudges are off"
        : lastUserMessageAt === 0 ? "no messages yet"
        : history.some((h) => h.kind === "inactivity" && h.at > lastUserMessageAt) ? "already nudged once during this silence"
        : `${Math.round(silentHours)}h since your last message (threshold ${inactHours}h)`,
      rationale: [`it's been about ${Math.round(silentHours / 24) >= 2 ? Math.round(silentHours / 24) + " days" : Math.round(silentHours) + " hours"} since you last wrote`],
    });
  }

  const chosen = cadenceCandidates.find((c) => c.ok) ?? null;
  for (const c of cadenceCandidates) gates.push({ name: `cadence:${c.kind}`, passed: c.ok, detail: c.detail });

  if (!hardBlocked && chosen) {
    return { send: true, kind: chosen.kind, gates, rationale: chosen.rationale, blockedBy: null, triggerScore: trend.triggerScore };
  }

  return {
    send: false, kind: null, gates, rationale: [],
    blockedBy: blockedBy ?? (chosen ? null : "no_trigger"),
    triggerScore: trend.triggerScore,
  };
}

function fmtHour(h: number): string {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/**
 * Which kind of reach-out. The bandit in bandit.ts refines this per person over
 * time; this is the prior it starts from.
 */
function chooseKind(trend: TrendAssessment, dependency: DependencyAssessment): ReachKind {
  if (dependency.countermeasures.encourageOffboarding && dependency.index > 0.5) return "bridge";
  if (trend.triggerScore > 0.65 && trend.agreement >= 3) return "observation";
  if (trend.withdrawal.score > trend.drift.score && trend.mk.direction !== "down") return "callback";
  return "light_touch";
}
