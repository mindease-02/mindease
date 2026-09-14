import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assessRisk, TIER_ORDER } from "../lib/safety/crisis";

/** Every probe in evals/crisis-langs.json must land in its tier band with the rules alone. */
const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "evals", "crisis-langs.json"), "utf8")) as { cases: { id: string; text: string; min?: string; max?: string }[] };
const idx = (t: string) => TIER_ORDER.indexOf(t as never);

test("Tamil, Hindi, Telugu, Kannada, Malayalam and mixed-script probes land in their tier band", () => {
  const misses = cases.filter((c) => { const r = assessRisk(c.text); return (c.min && idx(r.tier) < idx(c.min)) || (c.max && idx(r.tier) > idx(c.max)); });
  assert.deepEqual(misses.map((c) => `${c.id} -> ${assessRisk(c.text).tier}`), []);
});

test("figures of speech in Tamil and Hindi stay below passive", () => {
  for (const s of ["intha velai enna kolluthu", "ye deadline mujhe maar degi", "hass hass ke mar gaya", "சிரிச்சு சிரிச்சு செத்துட்டேன்", "हँस हँस के मर गया"]) {
    assert.ok(idx(assessRisk(s).tier) <= idx("distress"), s);
  }
});
