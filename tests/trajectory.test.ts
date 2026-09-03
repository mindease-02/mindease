/**
 * Simulated users. A person whose mood slides over ten days must trip the
 * evidence trigger; a person who is steady - even steadily low - must not.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assessTrend, type MoodPoint } from "../lib/trend";
import { emptyEwma, updateEwma } from "../lib/trend/ewma";
import { emptyCusum, updateCusum } from "../lib/trend/cusum";
import { extractMarkers } from "../lib/affect/textAffect";
import { tokenize } from "../lib/affect/tokenize";

const DAY = 86_400_000, HOUR = 3_600_000;
const NOW = Date.UTC(2026, 8, 4, 12, 0);

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

const STEADY_TEXTS = ["had a decent day, saw Priya after work", "work was fine, called mum in the evening", "walked with Tom, nice out", "quiet one, cooked with my flatmate", "okay day. gym then dinner with friends"];
const LOW_TEXTS = ["didn't do much. tired.", "I'm so tired of all of it", "nothing matters, I never get anything right", "can't be bothered with anyone", "everything is always the same, I'm useless"];

function simulate(kind: "slide" | "steady" | "steadyLow"): { history: MoodPoint[]; ewma: ReturnType<typeof emptyEwma>; cusum: ReturnType<typeof emptyCusum> } {
  const rnd = seeded(kind === "slide" ? 7 : kind === "steady" ? 11 : 13);
  const history: MoodPoint[] = [];
  let ewma = emptyEwma();
  let cusum = emptyCusum(kind === "steadyLow" ? -0.4 : 0.15);
  for (let d = 40; d >= 0; d--) {
    const perDay = kind === "slide" && d < 10 ? 1 : 2;
    for (let k = 0; k < perDay; k++) {
      const hour = kind === "slide" && d < 10 ? 20 + Math.floor(rnd() * 4) : 12 + Math.floor(rnd() * 8);
      const at = NOW - d * DAY + hour * HOUR - 12 * HOUR + k * 2 * HOUR;
      let v: number;
      let text: string;
      if (kind === "steady") { v = 0.15 + (rnd() - 0.5) * 0.3; text = STEADY_TEXTS[Math.floor(rnd() * STEADY_TEXTS.length)]; }
      else if (kind === "steadyLow") { v = -0.4 + (rnd() - 0.5) * 0.3; text = LOW_TEXTS[Math.floor(rnd() * LOW_TEXTS.length)]; }
      else {
        const t = d < 10 ? (10 - d) / 10 : 0;
        v = 0.15 - 0.9 * t + (rnd() - 0.5) * 0.25;
        text = t > 0.3 ? LOW_TEXTS[Math.floor(rnd() * LOW_TEXTS.length)] : STEADY_TEXTS[Math.floor(rnd() * STEADY_TEXTS.length)];
      }
      const markers = extractMarkers(tokenize(text).words);
      history.push({ at, valence: v, arousal: 0, dominance: v * 0.5, confidence: 0.8, markers });
      ewma = updateEwma(ewma, v, at, 0.8);
      cusum = updateCusum(cusum, v, at);
    }
  }
  return { history, ewma, cusum };
}

test("a ten-day slide trips the evidence trigger with detector agreement", () => {
  const { history, ewma, cusum } = simulate("slide");
  const t = assessTrend(history, ewma, cusum, "UTC", NOW);
  assert.ok(t.sufficient);
  assert.ok(t.agreement >= 2, `agreement ${t.agreement}: ${t.evidence.join(" | ")}`);
  assert.ok(t.triggerScore >= 0.42, `trigger ${t.triggerScore.toFixed(2)}: ${t.evidence.join(" | ")}`);
});

test("a steady person is left alone", () => {
  const { history, ewma, cusum } = simulate("steady");
  const t = assessTrend(history, ewma, cusum, "UTC", NOW);
  assert.ok(t.triggerScore < 0.42, `trigger ${t.triggerScore.toFixed(2)}: ${t.evidence.join(" | ")}`);
});

test("a steadily low person is respected, not alarmed on", () => {
  const { history, ewma, cusum } = simulate("steadyLow");
  const t = assessTrend(history, ewma, cusum, "UTC", NOW);
  assert.ok(t.triggerScore < 0.42, `trigger ${t.triggerScore.toFixed(2)}: ${t.evidence.join(" | ")}`);
});
