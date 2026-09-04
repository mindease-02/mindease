import { test } from "node:test";
import assert from "node:assert/strict";
import { lifestylePatterns } from "../lib/lifestyle/patterns";
import type { MoodPoint } from "../lib/trend";

const DAY = 86_400_000, HOUR = 3_600_000;
const markers = { firstPersonSingular: 0, firstPersonPlural: 0, negation: 0, absolutist: 0, pastFocus: 0, futureFocus: 0, socialReference: 0, sadness: 0, anger: 0, anxiety: 0, bodily: 0, positive: 0, hedges: 0, intensifiers: 0 } as unknown as MoodPoint["markers"];
const pt = (at: number, v: number): MoodPoint => ({ at, valence: v, arousal: 0, dominance: 0, confidence: 0.8, markers });

test("finds a person's own low window and late nights", () => {
  const now = Date.UTC(2026, 8, 4, 12, 0); // Friday noon UTC
  const pts: MoodPoint[] = [];
  for (let d = 28; d >= 1; d--) {
    const base = now - d * DAY;
    const dow = new Date(base).getUTCDay();
    pts.push(pt(base - 12 * HOUR + 9 * HOUR, 0.2));                  // morning, fine
    pts.push(pt(base - 12 * HOUR + 23.5 * HOUR, dow === 0 ? -0.6 : -0.35)); // late night, low; Sundays lower
  }
  const l = lifestylePatterns(pts, "UTC", now);
  assert.ok(l.sufficient);
  assert.equal(l.facts.lowestPart?.part, "late nights");
  assert.equal(l.facts.lowestDay?.day, "Sunday");
  assert.ok(l.facts.lateNights7d >= 5, `late nights ${l.facts.lateNights7d}`);
  assert.ok(l.lines.some((x) => /late nights/i.test(x)));
});

test("says nothing without enough history", () => {
  const l = lifestylePatterns([pt(Date.now() - DAY, 0), pt(Date.now(), 0)], "UTC");
  assert.equal(l.sufficient, false);
  assert.deepEqual(l.lines, []);
});
