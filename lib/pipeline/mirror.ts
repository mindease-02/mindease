/**
 * The Mirror: everything the system currently believes about the person, in a
 * shape the UI can render. Transparency is not a settings page here - it is
 * the product's answer to "why did you say that".
 */
import { assessTrend } from "../trend";
import { assessDependency } from "../dependency";
import { decideProactive } from "../proactive/policy";
import { armSummary } from "../proactive/bandit";
import { summarizeOctant, octantShift } from "../affect/octant";
import { isolationToday } from "./checkin";
import type { UserState } from "../store/types";
import { helplinesFor, emergencyFor } from "../safety/resources";

export function mirrorView(state: UserState, now = Date.now()) {
  const trend = assessTrend(state.history, state.ewma, state.cusum, state.timeZone, now);
  const recentUserText = state.messages.filter((m) => m.role === "user").slice(-30).map((m) => m.content);
  const dependency = assessDependency(state.history, recentUserText, now);
  const cadence = { cadenceLog: state.cadenceLog, ...isolationToday(state, now) };
  const decision = decideProactive({
    trend, dependency, consent: state.consent, history: state.outreach,
    lastUserMessageAt: state.lastUserMessageAt, recentRisk: state.risk, cadence, pausedUntil: state.pausedUntil, now,
  });
  const recent = state.history.slice(-40).map((p) => ({ at: p.at, v: Number(p.valence.toFixed(3)), a: Number(p.arousal.toFixed(3)), c: Number(p.confidence.toFixed(2)) }));

  return {
    name: state.displayName,
    consent: state.consent,
    pausedUntil: state.pausedUntil ?? null,
    mood: {
      now: state.ewma.initialized ? Number(state.ewma.fast.toFixed(3)) : null,
      baseline: state.ewma.initialized ? Number(state.ewma.slow.toFixed(3)) : null,
      momentum: Number(trend.momentum.toFixed(3)),
      points: recent,
    },
    octant: state.octant.initialized ? {
      weather: state.octant.weather, climate: state.octant.climate,
      summary: summarizeOctant(state.octant.weather).description,
      shift: octantShift(state.octant).slice(0, 3),
    } : null,
    analysis: state.lastAnalysis ?? null,
    trend: { score: trend.triggerScore, agreement: trend.agreement, evidence: trend.evidence, sufficient: trend.sufficient, historyPoints: state.history.length },
    dependency: { tier: dependency.tier, index: Number(dependency.index.toFixed(2)), reasons: dependency.reasons },
    checkin: { wouldSend: decision.send, kind: decision.kind, blockedBy: decision.blockedBy, gates: decision.gates, rationale: decision.rationale },
    outreach: state.outreach.slice(-10).reverse(),
    bandit: armSummary(state.bandit),
    memories: state.memories.slice().sort((a, b) => b.at - a.at).map((m) => ({ id: m.id, kind: m.kind, text: m.text, at: m.at, importance: m.importance, recallCount: m.recallCount, era: m.era ?? null })),
    risk: state.risk,
    helplines: helplinesFor(state.region),
    emergency: emergencyFor(state.region),
    messages: state.consent.storeTranscript ? state.messages.slice(-60) : [],
  };
}
export type MirrorView = ReturnType<typeof mirrorView>;
