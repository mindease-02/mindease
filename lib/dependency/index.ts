/**
 * Dependency measurement.
 *
 * Every engagement-optimised product has a metric that goes up when someone needs
 * it more. This one has a metric that going up is a *failure*, and the system is
 * wired to act against itself when it does.
 *
 * The distinction that matters is complement vs substitute. Someone talking to
 * this more while also seeing people more is fine - that is a companion working.
 * Someone talking to this more while their references to other humans fall is the
 * failure mode, and it looks identical on any engagement dashboard. So we track
 * both series and score the *divergence* between them, not the volume.
 *
 * Named for what it is: this is the Joi problem from Blade Runner 2049. An AI
 * that is perfectly attentive, always available, and shaped entirely around one
 * person is not a good outcome for that person, however good it feels. The film
 * is clear-eyed about that and so is this - the giant advert that says "everything
 * you want to hear" is the point of the character, not a plot twist.
 */
import type { MoodPoint } from "../trend";
import { mean, slope } from "../util/stats";
import { DAY } from "../util/time";

/** Phrases that indicate the relationship is being treated as a substitute. */
const EXCLUSIVITY_PATTERNS: [RegExp, number, string][] = [
  [/\b(only|just)\s+(one|person|thing)\s+(i|that i)\s+(can|could)\s+(talk|speak)/i, 0.9, "only one I can talk to"],
  [/\byou'?re?\s+(the\s+)?(only|one)\s+(one|person|thing)\b/i, 0.9, "you're the only one"],
  [/\bno\s?(one|body)\s+else\b/i, 0.7, "no one else"],
  [/\bi\s+(don'?t|do not)\s+(have|need)\s+(any\s+)?(other\s+)?(friends?|people|anyone)\b/i, 0.85, "no other people"],
  [/\b(don'?t|do not)\s+(want|need)\s+(to\s+)?(see|talk to)\s+(any)?(one|body|people)\b/i, 0.7, "not wanting to see people"],
  [/\b(cancel|cancelled|skipped|bailed)\b.{0,40}\b(plans?|meeting|dinner|therapy|friends?)\b/i, 0.6, "cancelling plans"],
  [/\bi'?d?\s+rather\s+(just\s+)?(talk to|be with|stay with)\s+you\b/i, 0.8, "preferring this to people"],
  [/\bdo\s+you\s+(miss|love|care about)\s+me\b/i, 0.5, "asking about the system's feelings"],
  [/\bare\s+you\s+(real|conscious|alive|sentient)\b/i, 0.3, "asking whether this is real"],
  [/\byou'?re?\s+my\s+(best\s+)?friend\b/i, 0.55, "naming this a friendship"],
  [/\bi\s+love\s+you\b/i, 0.6, "expressing love"],
  [/\bwhat\s+would\s+i\s+do\s+without\s+you\b/i, 0.75, "not coping without this"],
];

export interface DependencySignals {
  /** Sessions per day, recent window. */
  contactRate: number;
  contactRateBaseline: number;
  /** Slope of daily contact count over the recent window. */
  contactSlopePerDay: number;
  /** Mean socialReference marker, recent vs baseline. */
  socialReference: number;
  socialReferenceBaseline: number;
  /** Cumulative weight of exclusivity language matched in the recent window. */
  exclusivityWeight: number;
  exclusivityExamples: string[];
  /** Messages per session. */
  sessionDepth: number;
  sessionDepthBaseline: number;
}

export type DependencyTier = "healthy" | "watch" | "elevated" | "high";

export interface DependencyAssessment {
  index: number;
  tier: DependencyTier;
  signals: DependencySignals;
  reasons: string[];
  /** Behaviour changes the rest of the system must apply at this tier. */
  countermeasures: Countermeasures;
}

export interface Countermeasures {
  /** Multiplier on the proactive check-in budget. Falls below 1 as reliance rises. */
  reachOutBudgetMultiplier: number;
  /** Ask, at least once this session, about a specific human they could contact. */
  surfaceHumanAlternatives: boolean;
  /** Say the dynamic out loud, without hedging, in the reply. */
  nameTheDynamic: boolean;
  /** Keep replies shorter and less absorbing. Warmth stays; stickiness goes. */
  shortenResponses: boolean;
  /** Offer to schedule a real-world action and follow up on that, not on this chat. */
  encourageOffboarding: boolean;
  /** Decline to be the primary support and say why. Highest tier only. */
  declinePrimaryRole: boolean;
}

const RECENT_MS = 14 * DAY;
const BASE_MS = 60 * DAY;

export function assessDependency(
  history: MoodPoint[],
  recentUserText: string[],
  now = Date.now(),
): DependencyAssessment {
  const recent = history.filter((p) => p.at >= now - RECENT_MS);
  const base = history.filter((p) => p.at < now - RECENT_MS && p.at >= now - BASE_MS);

  const days = (ps: MoodPoint[], span: number) =>
    ps.length === 0 ? 0 : ps.length / Math.max(1, span / DAY);

  const contactRate = days(recent, Math.min(RECENT_MS, now - (history[0]?.at ?? now)));
  const contactRateBaseline = days(base, BASE_MS - RECENT_MS);

  // Daily counts, for the slope.
  const byDay = new Map<number, number>();
  for (const p of recent) {
    const d = Math.floor(p.at / DAY);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const dayKeys = [...byDay.keys()].sort((a, b) => a - b);
  const contactSlopePerDay = slope(dayKeys, dayKeys.map((k) => byDay.get(k)!));

  const socialReference = mean(recent.map((p) => p.markers.socialReference));
  const socialReferenceBaseline = mean(base.map((p) => p.markers.socialReference));

  let exclusivityWeight = 0;
  const exclusivityExamples: string[] = [];
  for (const text of recentUserText) {
    for (const [re, w, label] of EXCLUSIVITY_PATTERNS) {
      if (re.test(text)) {
        exclusivityWeight += w;
        if (!exclusivityExamples.includes(label)) exclusivityExamples.push(label);
      }
    }
  }

  const sessionDepth = sessionDepthOf(recent);
  const sessionDepthBaseline = sessionDepthOf(base);

  const signals: DependencySignals = {
    contactRate, contactRateBaseline, contactSlopePerDay,
    socialReference, socialReferenceBaseline,
    exclusivityWeight, exclusivityExamples,
    sessionDepth, sessionDepthBaseline,
  };

  const reasons: string[] = [];
  const cap = (x: number) => Math.max(0, Math.min(1, x));
  let index = 0;

  // The core term: reliance on this going up while reference to people goes down.
  const contactGrowth = contactRateBaseline > 0.2
    ? (contactRate - contactRateBaseline) / contactRateBaseline
    : 0;
  const socialDecline = socialReferenceBaseline > 1e-4
    ? (socialReferenceBaseline - socialReference) / socialReferenceBaseline
    : 0;

  if (contactGrowth > 0.3 && socialDecline > 0.2) {
    // Substitution: the divergence itself, not either series alone.
    index += 0.40 * cap(contactGrowth / 1.5) * cap(socialDecline / 0.6 + 0.3);
    reasons.push("you're here more often, and mentioning other people less");
  } else if (contactGrowth > 0.3 && socialDecline <= 0) {
    // Complement: more contact here AND more elsewhere. Explicitly not penalised.
    reasons.push("you're here more, and still connected elsewhere - that reads fine");
  }

  if (exclusivityWeight > 0.6) {
    index += 0.32 * cap(exclusivityWeight / 2.5);
    reasons.push(`you've said things like: ${exclusivityExamples.slice(0, 3).join("; ")}`);
  }
  if (contactSlopePerDay > 0.35) {
    index += 0.15 * cap(contactSlopePerDay / 1.5);
    reasons.push("your contact with me is climbing week on week");
  }
  if (sessionDepthBaseline > 0 && sessionDepth > sessionDepthBaseline * 1.8) {
    index += 0.13 * cap(sessionDepth / (sessionDepthBaseline * 3));
    reasons.push("sessions are running much longer than they used to");
  }

  index = cap(index);
  const tier: DependencyTier =
    index >= 0.7 ? "high" : index >= 0.45 ? "elevated" : index >= 0.22 ? "watch" : "healthy";

  return { index, tier, signals, reasons, countermeasures: countermeasuresFor(tier) };
}

function sessionDepthOf(ps: MoodPoint[]): number {
  if (!ps.length) return 0;
  const GAP = 45 * 60 * 1000;
  let sessions = 1;
  for (let i = 1; i < ps.length; i++) if (ps[i].at - ps[i - 1].at >= GAP) sessions++;
  return ps.length / sessions;
}

export function countermeasuresFor(tier: DependencyTier): Countermeasures {
  switch (tier) {
    case "healthy":
      return {
        reachOutBudgetMultiplier: 1,
        surfaceHumanAlternatives: false,
        nameTheDynamic: false,
        shortenResponses: false,
        encourageOffboarding: false,
        declinePrimaryRole: false,
      };
    case "watch":
      return {
        reachOutBudgetMultiplier: 0.8,
        surfaceHumanAlternatives: true,
        nameTheDynamic: false,
        shortenResponses: false,
        encourageOffboarding: false,
        declinePrimaryRole: false,
      };
    case "elevated":
      return {
        reachOutBudgetMultiplier: 0.5,
        surfaceHumanAlternatives: true,
        nameTheDynamic: true,
        shortenResponses: true,
        encourageOffboarding: true,
        declinePrimaryRole: false,
      };
    case "high":
      // Deliberately counter-intuitive: at the point the person most wants this to
      // be available, it becomes less available and says why. Warmth is not
      // withdrawn - availability is. Those are different, and the difference is
      // the entire ethical content of this file.
      return {
        reachOutBudgetMultiplier: 0.25,
        surfaceHumanAlternatives: true,
        nameTheDynamic: true,
        shortenResponses: true,
        encourageOffboarding: true,
        declinePrimaryRole: true,
      };
  }
}
