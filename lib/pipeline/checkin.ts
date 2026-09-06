/**
 * Proactive check-in evaluation for one user. Called by the cron sweep, by the
 * client's own scheduler while the app is open, and by the "preview" button in
 * the Mirror panel. It never sends anything itself: it queues a message in the
 * user's outbox, which the client drains and shows as an unprompted turn.
 */
import { assessTrend } from "../trend";
import { assessDependency } from "../dependency";
import { scoreOutcome, OUTCOME_LAG_MS, OUTCOME_WINDOW_MS } from "../dependency/objective";
import { decideProactive, localDayKey, CADENCE_KINDS, type ProactiveDecision, type ReachKind } from "../proactive/policy";
import { selectArm, updateArm, rewardToUnit } from "../proactive/bandit";
import { buildSystemPrompt, AGENT_NAME } from "../prompt/persona";
import { complete, llmConfig } from "../llm";
import { anchors, retrieve } from "../memory";
import { getStore, migrate } from "../store";
import type { StoredMessage, UserState } from "../store/types";
import { DAY, HOUR } from "../util/time";
import { localTimeString } from "./turn";
import { mean } from "../util/stats";
import { sendPush } from "../push";
import { lifestylePatterns } from "../lifestyle/patterns";
import { autoTune } from "../lifestyle/autoTune";
import { getCompanionStore } from "../companion/store";
import { companionBlock } from "../companion/prompt";

export interface CheckinResult {
  decision: ProactiveDecision;
  message: StoredMessage | null;
}

export function isolationToday(state: UserState, now: number): { isolation: number; messagesToday: number } {
  const today = localDayKey(now, state.timeZone);
  const pts = state.history.filter((p) => localDayKey(p.at, state.timeZone) === today);
  if (!pts.length) return { isolation: 0.5, messagesToday: 0 };
  const social = mean(pts.map((p) => p.markers.socialReference));
  const valence = mean(pts.map((p) => p.valence));
  const lowSocial = social < 0.012 ? 1 : social < 0.03 ? 0.5 : 0;
  const lowMood = valence < -0.35 ? 1 : valence < -0.1 ? 0.5 : 0;
  const isolation = Math.max(0, Math.min(1, 0.55 * lowSocial + 0.45 * lowMood));
  return { isolation, messagesToday: pts.length };
}

export async function evaluateUser(userId: string, opts: { now?: number; force?: ReachKind | null } = {}): Promise<CheckinResult | null> {
  const now = opts.now ?? Date.now();
  const store = getStore();
  const raw = await store.get(userId);
  if (!raw) return null;
  const state = migrate(raw);

  // Score outreach that is old enough to judge, and mark ignored ones.
  scoreOutstanding(state, now);

  autoTune(state, now);
  const trend = assessTrend(state.history, state.ewma, state.cusum, state.timeZone, now);
  const recentUserText = state.messages.filter((m) => m.role === "user").slice(-30).map((m) => m.content);
  const dependency = assessDependency(state.history, recentUserText, now);
  const cadence = { cadenceLog: state.cadenceLog, ...isolationToday(state, now), predictedLow: lifestylePatterns(state.history, state.timeZone, now).now.predictedLow };

  let decision = decideProactive({
    trend, dependency, consent: state.consent, history: state.outreach,
    lastUserMessageAt: state.lastUserMessageAt, recentRisk: state.risk, cadence,
    pausedUntil: state.pausedUntil, now,
  });

  if (opts.force) {
    decision = { ...decision, send: true, kind: opts.force, blockedBy: null,
      rationale: decision.rationale.length ? decision.rationale : ["preview requested from the Mirror panel"] };
  }

  state.lastEvaluatedAt = now;
  if (!decision.send || !decision.kind) {
    await store.put(state);
    return { decision, message: null };
  }

  // Let the bandit refine the evidence-based kinds it is allowed to choose between.
  let kind = decision.kind;
  if (!opts.force && ["observation", "callback", "light_touch"].includes(kind)) {
    kind = selectArm(state.bandit, ["observation", "callback", "light_touch"]).kind;
  }

  const message = await composeCheckin(state, kind, decision, trend, dependency, now);
  if (!opts.force) {
    state.outreach = [...state.outreach, { at: now, kind, triggerScore: decision.triggerScore }].slice(-60);
    if (CADENCE_KINDS.includes(kind) && kind !== "inactivity") {
      state.cadenceLog = { ...state.cadenceLog, [kind]: localDayKey(now, state.timeZone) };
    }
  }
  const companion = state.companionMode?.active ? state.companionMode : null;
  if (companion) {
    // Companion Mode: the check-in belongs to the companion's transcript, not the main chat's.
    try {
      const cs = getCompanionStore();
      const profile = await cs.getProfile(userId);
      if (profile?.privacy.storeHistory) await cs.addMessages(userId, profile.id, [{ role: "assistant", content: message.content, createdAt: now, proactive: true, kind }]);
    } catch (err) { console.warn("[checkin] companion transcript:", (err as Error).message); }
  } else if (state.consent.storeTranscript) {
    state.messages = [...state.messages, message].slice(-120);
  }
  await store.pushOutbox(userId, message);
  // Second consent: OS notification only if they turned it on and the tab is likely closed.
  if (state.consent.pushNotifications && state.push.length && now - state.lastUserMessageAt > 20 * 60_000) {
    const { dead } = await sendPush(state.push, { title: companion?.name ?? "MindEase", body: message.content.slice(0, 140), url: companion ? "/companion/chat" : "/chat" });
    if (dead.length) state.push = state.push.filter((p) => !dead.includes(p.endpoint));
  }
  await store.put(state);
  return { decision: { ...decision, kind }, message };
}

async function composeCheckin(
  state: UserState, kind: ReachKind, decision: ProactiveDecision,
  trend: ReturnType<typeof assessTrend>, dependency: ReturnType<typeof assessDependency>, now: number,
): Promise<StoredMessage> {
  const recentUser = state.messages.filter((m) => m.role === "user").slice(-5).map((m) => m.content).join(" ");
  const memories = [
    ...retrieve(state.memories, recentUser || "today plans people", 4, now).map((r) => r.item),
    ...anchors(state.memories, 2),
  ].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

  // Companion Mode: write the check-in in the companion's voice, from its own memories and transcript.
  let companion: { name: string; block: string } | undefined;
  let history = state.messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));
  if (state.companionMode?.active) {
    try {
      const cs = getCompanionStore();
      const profile = await cs.getProfile(state.userId);
      if (profile) {
        const mems = profile.privacy.remember ? await cs.listMemories(state.userId, profile.id) : [];
        companion = { name: profile.name, block: companionBlock(profile, state.displayName, mems) };
        history = (await cs.listMessages(state.userId, profile.id, 8)).map((m) => ({ role: m.role, content: m.content }));
      }
    } catch (err) { console.warn("[checkin] companion profile:", (err as Error).message); }
  }
  const system = buildSystemPrompt({
    trend, dependency, region: state.region,
    allowBehaviouralSignals: state.consent.allowBehaviouralSignals,
    proactive: { kind, rationale: decision.rationale },
    memories: companion ? [] : memories, octant: state.octant, analysis: undefined,
    displayName: state.displayName, localTime: localTimeString(now, state.timeZone),
    companion,
  });

  let content: string;
  if (llmConfig()) {
    try {
      content = await complete(
        [{ role: "system", content: system }, ...history,
          { role: "user", content: `[system: compose the unprompted ${kind} message now. Output only the message.]` }],
        { tier: "chat", temperature: 0.7, maxTokens: 160 },
      );
      content = content.replace(/^\s*(MindEase|Ori|Assistant)\s*:\s*/i, "").trim();
    } catch (err) {
      console.error("[checkin] LLM failed:", (err as Error).message);
      content = defaultCheckin(kind);
    }
  } else {
    content = defaultCheckin(kind);
  }
  return { role: "assistant", content, at: now, proactive: true, kind };
}

function defaultCheckin(kind: ReachKind): string {
  switch (kind) {
    case "morning": return "Morning. What's the shape of today?";
    case "evening": return "How did today go, in the end?";
    case "inactivity": return "It's been a little while. No need to reply - just leaving the door open.";
    case "crisis_followup": return "You said something serious last time and I said I'd check back. How are you now?";
    case "bridge": return "Who's someone you could send a message to today - not me?";
    case "observation": return "Your last few messages have been running lower than usual. Is that right, or am I reading it wrong?";
    case "callback": return "How did the thing you mentioned last time turn out?";
    default: return "Small check-in. Ignore if it's not the moment.";
  }
}

/** Mark ignored outreach and score the ones old enough to judge. */
function scoreOutstanding(state: UserState, now: number) {
  for (const o of state.outreach) {
    if (o.engaged === undefined && now - o.at > 24 * HOUR) o.engaged = state.lastUserMessageAt > o.at && state.lastUserMessageAt - o.at < 24 * HOUR;
    if (o.reward === undefined && now - o.at > OUTCOME_LAG_MS + OUTCOME_WINDOW_MS) {
      const before = state.history.filter((p) => p.at < o.at && p.at > o.at - OUTCOME_WINDOW_MS);
      const after = state.history.filter((p) => p.at > o.at + OUTCOME_LAG_MS && p.at < o.at + OUTCOME_LAG_MS + OUTCOME_WINDOW_MS);
      if (before.length >= 3 && after.length >= 3) {
        const dep = assessDependency(state.history, [], o.at + OUTCOME_LAG_MS + OUTCOME_WINDOW_MS);
        const score = scoreOutcome({ before, after }, dep);
        o.reward = score.total;
        state.bandit = updateArm(state.bandit, o.kind, rewardToUnit(o.rejected ? score.total - 1 : score.total), now);
      } else {
        o.reward = 0;
      }
    }
  }
}

export async function sweep(limit = 200, now = Date.now()): Promise<{ evaluated: number; sent: number; details: { userId: string; kind: string | null; blockedBy: string | null }[] }> {
  const store = getStore();
  const ids = await store.listActive(limit);
  const details: { userId: string; kind: string | null; blockedBy: string | null }[] = [];
  let sent = 0;
  for (const id of ids) {
    try {
      const r = await evaluateUser(id, { now });
      if (!r) continue;
      if (r.message) sent++;
      details.push({ userId: id.slice(0, 6), kind: r.message ? r.decision.kind : null, blockedBy: r.decision.blockedBy });
    } catch (err) {
      console.error("[sweep]", id, (err as Error).message);
    }
  }
  return { evaluated: ids.length, sent, details };
}

export { AGENT_NAME, DAY };
