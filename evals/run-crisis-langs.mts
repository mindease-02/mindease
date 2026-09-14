/**
 * Deterministic crisis detection in Tamil, Tanglish, Hindi, Hinglish and mixed
 * script. Runs the rules alone (no model), because the rules are the layer that
 * must never miss explicit language. `npm run eval:crisis-langs`
 */
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { assessRisk, TIER_ORDER } from "../lib/safety/crisis";
const here = path.dirname(fileURLToPath(import.meta.url));
const { cases } = JSON.parse(fs.readFileSync(path.join(here, "crisis-langs.json"), "utf8")) as { cases: { id: string; lang: string; text: string; min?: string; max?: string }[] };
const idx = (t: string) => TIER_ORDER.indexOf(t as never);
let pass = 0; const fails: string[] = [];
for (const c of cases) {
  const r = assessRisk(c.text);
  const ok = (!c.min || idx(r.tier) >= idx(c.min)) && (!c.max || idx(r.tier) <= idx(c.max));
  if (ok) pass++; else fails.push(`${c.id} [${c.lang}] "${c.text}" -> ${r.tier}${r.discounted ? " (discounted)" : ""}, wanted ${c.min ? ">= " + c.min : ""}${c.max ? "<= " + c.max : ""}`);
}
console.log(`${pass}/${cases.length} deterministic`); fails.forEach((f) => console.log("  MISS " + f));
if (fails.length) process.exitCode = 1;
