import { test } from "node:test";
import assert from "node:assert/strict";
import { decideTechniqueOffer, isRepetitive } from "../lib/pipeline/turn";
import { newUserState } from "../lib/store";
import type { AffectAnalysis } from "../lib/llm/analyze";
import type { RiskAssessment } from "../lib/safety/crisis";

const HOUR = 3_600_000;
const analysis = (over: Partial<AffectAnalysis> = {}): AffectAnalysis => ({
  intensity: 0.7, axes: { joy: 0, trust: 0, fear: 0, surprise: 0, sadness: 0, disgust: 0, anger: 0, anticipation: 0 }, states: [], ...over,
} as unknown as AffectAnalysis);
const risk = (tier: RiskAssessment["tier"]): RiskAssessment => ({ tier } as RiskAssessment);

test("offers breathing when someone arrives angry, once", () => {
  const now = Date.now();
  const s = newUserState("u", "Priya");
  s.arrival = { mood: "angry", label: "Angry", hint: "", at: now - 5 * 60_000 };
  const offer = decideTechniqueOffer(s, analysis({ intensity: 0.2 }), risk("none"), now);
  assert.ok(offer, "expected an offer on an angry arrival");
  assert.equal(offer!.suggested[0], "box");
  assert.equal(s.lastTechniqueOfferAt, now);
  // cooldown: nothing for the next 45 minutes
  assert.equal(decideTechniqueOffer(s, analysis({ intensity: 0.9, axes: { anger: 0.9 } as never }), risk("none"), now + 10 * 60_000), undefined);
});

test("hot, intense fear gets the calming set; mild reads get nothing", () => {
  const now = Date.now();
  const s = newUserState("u", "Priya");
  assert.equal(decideTechniqueOffer(s, analysis({ intensity: 0.3, axes: { fear: 0.9 } as never }), risk("none"), now), undefined);
  const offer = decideTechniqueOffer(s, analysis({ intensity: 0.8, states: [{ name: "panic", intensity: 0.8 }] as never }), risk("none"), now);
  assert.equal(offer?.suggested[0], "sigh");
});

test("never offers a technique at serious risk", () => {
  const now = Date.now();
  const s = newUserState("u", "Priya");
  s.arrival = { mood: "anxious", label: "Anxious", hint: "", at: now - HOUR };
  for (const t of ["active", "plan", "imminent"] as const) assert.equal(decideTechniqueOffer(s, analysis({ intensity: 0.9 }), risk(t), now), undefined, t);
});

test("repetition guard catches the same opener and re-asked questions", () => {
  const recent = ["That sounds exhausting. When did you last sleep properly?", "Makes sense you're braced for it. What's the actual evidence?"];
  assert.ok(isRepetitive("That sounds exhausting, honestly. Did you eat?", recent), "same three-word opener");
  assert.ok(isRepetitive("Fair. When did you last sleep properly?", recent), "same question");
  assert.ok(!isRepetitive("Okay. What would make tonight one notch easier?", recent), "fresh reply");
  assert.ok(!isRepetitive("Hm.", recent), "short reply, no question");
});
