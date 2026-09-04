/**
 * What the person sees in the Mirror: the minimum that keeps the system honest
 * without turning it into a dashboard. Everything else (detector scores, gate
 * verdicts, bandit posteriors, safety log, calibration) stays in the store and
 * is reachable only through the admin API for review and training.
 */
import { assessTrend } from "../trend";
import { assessDependency } from "../dependency";
import { decideProactive } from "../proactive/policy";
import { summarizeOctant } from "../affect/octant";
import { isolationToday } from "./checkin";
import { helplinesFor, emergencyFor } from "../safety/resources";
import { lifestylePatterns } from "../lifestyle/patterns";
import { autoTune } from "../lifestyle/autoTune";
import { patternReport } from "../screening";
import { INSTRUMENTS } from "../screening/instruments";
import type { UserState } from "../store/types";

const PLAIN: Record<string, string> = {
  consent: "you've turned check-ins off",
  not_paused: "you asked for some space",
  not_mid_conversation: "you're here right now",
  quiet_hours: "it's your quiet hours",
  refractory: "it reached out recently",
  daily_max: "it's already checked in today",
  budget: "it's used this week's check-ins",
  not_being_ignored: "the last few went unanswered, so it's waiting for you",
  no_trigger: "nothing stood out that needed one",
};

export function userView(state: UserState, now = Date.now()) {
  const behaviour = autoTune(state, now);
  const trend = assessTrend(state.history, state.ewma, state.cusum, state.timeZone, now);
  const recentUserText = state.messages.filter((m) => m.role === "user").slice(-30).map((m) => m.content);
  const dependency = assessDependency(state.history, recentUserText, now);
  const cadence = { cadenceLog: state.cadenceLog, ...isolationToday(state, now) };
  const decision = decideProactive({
    trend, dependency, consent: state.consent, history: state.outreach,
    lastUserMessageAt: state.lastUserMessageAt, recentRisk: state.risk, cadence, pausedUntil: state.pausedUntil, now,
  });

  const a = state.lastAnalysis;
  const seem = state.octant.initialized ? summarizeOctant(state.octant.weather) : null;
  const states = a?.states.slice(0, 2).map((s) => s.name) ?? [];
  const sentence = !seem
    ? "Say something and Ori will start to get a sense of you."
    : seem.dominant.length === 0
      ? "Fairly settled, from what it can tell."
      : `Mostly ${seem.dominant[0].axis}${seem.dominant[1] ? ` with some ${seem.dominant[1].axis}` : ""}${seem.dyad ? ` — it reads as ${seem.dyad}` : ""}.`;

  return {
    name: state.displayName,
    consent: state.consent,
    pausedUntil: state.pausedUntil ?? null,
    seem: { sentence, states, why: a?.why ?? null, need: a?.need ?? null },
    octant: state.octant.initialized ? { weather: state.octant.weather, climate: state.octant.climate } : null,
    mood: state.history.slice(-30).map((p) => ({ at: p.at, v: Number(p.valence.toFixed(3)), c: Number(p.confidence.toFixed(2)) })),
    checkin: {
      wouldSend: decision.send,
      reason: decision.send
        ? (decision.rationale[0] ?? "something it noticed")
        : (PLAIN[decision.blockedBy ?? "no_trigger"] ?? "not right now"),
    },
    patterns: lifestylePatterns(state.history, state.timeZone, now).lines,
    behaviour,
    screenings: (state.screenings ?? []).filter((x) => x.completedAt).sort((a, b) => b.completedAt! - a.completedAt!).slice(0, 6).map((x) => ({ name: INSTRUMENTS[x.instrument].name, domain: INSTRUMENTS[x.instrument].domain, at: x.completedAt!, score: x.score!, max: INSTRUMENTS[x.instrument].max, band: x.band! })),
    signals: patternReport(state, now),
    memories: state.memories.slice().sort((x, y) => y.at - x.at).map((m) => ({ id: m.id, kind: m.kind, text: m.text, at: m.at, era: m.era ?? null })),
    helplines: helplinesFor(state.region),
    emergency: emergencyFor(state.region),
    region: state.region ?? null,
    pushDevices: state.push.length,
    messages: state.consent.storeTranscript ? state.messages.slice(-60) : [],
  };
}
export type UserView = ReturnType<typeof userView>;
