import { test } from "node:test";
import assert from "node:assert/strict";
import { decideProactive, DEFAULT_CONSENT, localDayKey } from "../lib/proactive/policy";
import { NO_TREND } from "../lib/trend/mannKendall";
import { emptyEwma } from "../lib/trend/ewma";
import { emptyCusum } from "../lib/trend/cusum";
import { countermeasuresFor } from "../lib/dependency/index";
import type { TrendAssessment } from "../lib/trend/index";
import type { DependencyAssessment } from "../lib/dependency/index";

const HOUR = 3_600_000;
// 2026-09-04 09:30 UTC
const MORNING = Date.UTC(2026, 8, 4, 9, 30);
const NIGHT = Date.UTC(2026, 8, 4, 23, 30);

function trend(over: Partial<TrendAssessment> = {}): TrendAssessment {
  return {
    now: MORNING, ewma: emptyEwma(), momentum: 0, mk: NO_TREND, cusum: emptyCusum(),
    rhythm: { circadianShiftHours: 0, lateNightShare: 0, lateNightShareBaseline: 0, interSessionGapHours: 0, interSessionGapBaseline: 0, sessionLength: 0, sessionLengthBaseline: 0, rhythmIrregularity: 0, rhythmIrregularityBaseline: 0, daysObserved: 0 },
    withdrawal: { score: 0, reasons: [] },
    drift: { firstPersonSingular: 0, absolutist: 0, socialReference: 0, lexicalDiversity: 0, futureFocus: 0, score: 0, reasons: [] },
    triggerScore: 0, agreement: 0, evidence: [], sufficient: false, ...over,
  };
}
function dep(tier: DependencyAssessment["tier"] = "healthy"): DependencyAssessment {
  return { index: 0, tier, reasons: [], countermeasures: countermeasuresFor(tier),
    signals: { contactRate: 0, contactRateBaseline: 0, contactSlopePerDay: 0, socialReference: 0, socialReferenceBaseline: 0, exclusivityWeight: 0, exclusivityExamples: [], sessionDepth: 0, sessionDepthBaseline: 0 } };
}
const base = () => ({
  trend: trend(), dependency: dep(), consent: { ...DEFAULT_CONSENT, timeZone: "UTC" },
  history: [], lastUserMessageAt: MORNING - 20 * HOUR, recentRisk: { tier: "none" as const, at: 0 },
  cadence: { cadenceLog: {}, isolation: 0, messagesToday: 0 }, now: MORNING,
});

test("morning check-in fires in the window when nothing else stops it", () => {
  const d = decideProactive(base());
  assert.equal(d.send, true);
  assert.equal(d.kind, "morning");
});

test("consent off blocks everything", () => {
  const d = decideProactive({ ...base(), consent: { ...DEFAULT_CONSENT, enabled: false } });
  assert.equal(d.send, false);
  assert.equal(d.blockedBy, "consent");
});

test("quiet hours block cadence", () => {
  const d = decideProactive({ ...base(), now: NIGHT, lastUserMessageAt: NIGHT - 20 * HOUR });
  assert.equal(d.send, false);
  assert.equal(d.blockedBy, "quiet_hours");
});

test("crisis follow-up bypasses quiet hours", () => {
  const d = decideProactive({ ...base(), now: NIGHT, recentRisk: { tier: "active", at: NIGHT - 20 * HOUR } });
  assert.equal(d.send, true);
  assert.equal(d.kind, "crisis_followup");
});

test("daily cap holds", () => {
  const b = base();
  const today = localDayKey(MORNING, "UTC");
  const history = [
    { at: MORNING - 8 * HOUR, kind: "light_touch" as const, triggerScore: 0.5 },
    { at: MORNING - 7 * HOUR, kind: "light_touch" as const, triggerScore: 0.5 },
  ].filter((h) => localDayKey(h.at, "UTC") === today);
  const d = decideProactive({ ...b, history, cadence: { cadenceLog: {}, isolation: 0, messagesToday: 0 } });
  if (history.length >= 2) { assert.equal(d.send, false); assert.equal(d.blockedBy, "daily_max"); }
});

test("three ignored check-ins in a row -> back off", () => {
  const history = [1, 2, 3].map((i) => ({ at: MORNING - i * 30 * HOUR, kind: "light_touch" as const, triggerScore: 0.5, engaged: false }));
  const d = decideProactive({ ...base(), history });
  assert.equal(d.send, false);
  assert.equal(d.blockedBy, "not_being_ignored");
});

test("evidence path beats cadence and needs two detectors", () => {
  const strong = trend({ sufficient: true, triggerScore: 0.7, agreement: 3, evidence: ["a downward trend"] });
  const d = decideProactive({ ...base(), trend: strong });
  assert.equal(d.send, true);
  assert.equal(d.kind, "observation");
  const weak = trend({ sufficient: true, triggerScore: 0.7, agreement: 1 });
  const d2 = decideProactive({ ...base(), trend: weak, consent: { ...DEFAULT_CONSENT, cadence: { morning: false, evening: false, inactivityHours: 0 } } });
  assert.equal(d2.send, false);
});

test("evening only when the day read as isolated", () => {
  const EVE = Date.UTC(2026, 8, 4, 19, 0);
  const quietDay = decideProactive({ ...base(), now: EVE, lastUserMessageAt: EVE - 5 * HOUR, cadence: { cadenceLog: {}, isolation: 0.2, messagesToday: 3 } });
  assert.equal(quietDay.send, false);
  const isolated = decideProactive({ ...base(), now: EVE, lastUserMessageAt: EVE - 5 * HOUR, cadence: { cadenceLog: {}, isolation: 0.8, messagesToday: 3 } });
  assert.equal(isolated.kind, "evening");
});

test("inactivity nudge once per silence", () => {
  const NOON = Date.UTC(2026, 8, 4, 12, 0);
  const last = NOON - 40 * HOUR;
  const first = decideProactive({ ...base(), now: NOON, lastUserMessageAt: last, cadence: { cadenceLog: { morning: localDayKey(NOON, "UTC") }, isolation: 0, messagesToday: 0 } });
  assert.equal(first.kind, "inactivity");
  const again = decideProactive({ ...base(), now: NOON, lastUserMessageAt: last, history: [{ at: NOON - 7 * HOUR, kind: "inactivity", triggerScore: 0 }], cadence: { cadenceLog: { morning: localDayKey(NOON, "UTC") }, isolation: 0, messagesToday: 0 } });
  assert.equal(again.send, false);
});
