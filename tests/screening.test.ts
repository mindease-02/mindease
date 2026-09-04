import { test } from "node:test";
import assert from "node:assert/strict";
import { INSTRUMENTS, bandFor } from "../lib/screening/instruments";
import { decideScreening, patternReport, resultMessage, scoreScreening } from "../lib/screening";
import { newUserState } from "../lib/store";
import type { MoodPoint } from "../lib/trend";

const DAY = 86_400_000, HOUR = 3_600_000;
const markers = { firstPersonSingular: 0.1, firstPersonPlural: 0.005, absolutist: 0.02, obligation: 0, pastFocus: 0.1, futureFocus: 0.02, lexicalDiversity: 0.6, negation: 0.02, cognitiveProcess: 0.05, socialReference: 0.005, tokens: 20, confidence: 0.8 } as unknown as MoodPoint["markers"];
const pt = (at: number, v: number, a = 0, d = 0): MoodPoint => ({ at, valence: v, arousal: a, dominance: d, confidence: 0.8, markers });

test("PHQ-9 scores and bands; item 9 flags crisis in the result message", () => {
  const s = scoreScreening({ instrument: "phq9", startedAt: 0, answers: [2, 2, 1, 2, 1, 2, 1, 0, 1] });
  assert.equal(s.score, 12);
  assert.equal(s.band, "moderate");
  const msg = resultMessage(s, "IN");
  assert.match(msg, /not a diagnosis/);
  assert.match(msg, /Tele-MANAS/);
  assert.match(msg, /better off dead/);
  assert.equal(bandFor(INSTRUMENTS.gad7, 4).label, "minimal");
  assert.equal(bandFor(INSTRUMENTS.isi, 16).label, "moderate");
});

test("a fortnight of low mood earns a PHQ-9 offer; a steady fortnight does not", () => {
  const now = Date.UTC(2026, 8, 4, 12);
  const low = newUserState("u1", "Test", "UTC", "IN");
  for (let d = 13; d >= 0; d--) for (const h of [10, 21]) low.history.push(pt(now - d * DAY - (12 - h) * HOUR, -0.45, -0.2));
  const offer = decideScreening(low, now);
  assert.equal(offer?.instrument, "phq9");
  assert.match(offer!.reason, /low mood on/);

  const fine = newUserState("u2", "Test", "UTC", "IN");
  for (let d = 13; d >= 0; d--) for (const h of [10, 21]) fine.history.push(pt(now - d * DAY - (12 - h) * HOUR, 0.2, 0));
  assert.equal(decideScreening(fine, now), undefined);
});

test("tense, aroused fortnight earns GAD-7; a screening in the last 14 days suppresses a repeat", () => {
  const now = Date.UTC(2026, 8, 4, 12);
  const anx = newUserState("u3", "Test", "UTC", "IN");
  for (let d = 13; d >= 0; d--) for (const h of [10, 21]) anx.history.push(pt(now - d * DAY - (12 - h) * HOUR, -0.2, 0.5));
  assert.equal(decideScreening(anx, now)?.instrument, "gad7");
  anx.screenings = [{ instrument: "gad7", startedAt: now - 3 * DAY, answers: [1, 1, 1, 1, 1, 1, 1], completedAt: now - 3 * DAY, score: 7, band: "mild" }];
  assert.equal(decideScreening(anx, now), undefined);
});

test("pattern report names domains with evidence and never a label", () => {
  const now = Date.UTC(2026, 8, 4, 12);
  const s = newUserState("u4", "Test", "UTC", "IN");
  for (let d = 10; d >= 0; d--) s.history.push(pt(now - d * DAY - HOUR, -0.5, -0.4));
  const r = patternReport(s, now);
  assert.ok(r.some((x) => x.domain === "persistent low mood"));
  assert.ok(r.every((x) => !/diagnos|disorder|depression\b/i.test(x.domain)));
});
