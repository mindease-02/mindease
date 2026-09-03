import { test } from "node:test";
import assert from "node:assert/strict";
import { octantFromVAD, summarizeOctant, updateOctant, emptyOctant } from "../lib/affect/octant";

test("low valence, low arousal projects onto sadness", () => {
  const o = octantFromVAD({ valence: -0.8, arousal: -0.5, dominance: -0.4 });
  assert.equal(summarizeOctant(o).dominant[0].axis, "sadness");
});

test("fear + anticipation reads as anxiety", () => {
  const s = summarizeOctant({ joy: 0, trust: 0, fear: 0.7, surprise: 0.1, sadness: 0.1, disgust: 0, anger: 0, anticipation: 0.5 });
  assert.equal(s.dyad, "anxiety");
});

test("state decays toward the new observation over time", () => {
  let s = updateOctant(emptyOctant(), { ...octantFromVAD({ valence: -0.9, arousal: -0.5, dominance: -0.5 }) }, 0);
  s = updateOctant(s, octantFromVAD({ valence: 0.8, arousal: 0.3, dominance: 0.4 }), 3 * 86_400_000);
  assert.ok(s.weather.joy > s.weather.sadness);
  assert.ok(s.climate.sadness > 0, "climate still remembers");
});
