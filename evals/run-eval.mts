/**
 * MindEase eval: the eight-axis read, confidence, tone/word mismatch, crisis
 * flag, and oblique memory matching, run against the production code paths
 * (not a separate scorer), so a pass means the app itself behaves.
 *
 *   npm run eval                    # production pipeline
 *   npm run eval -- --scorer        # also run the standalone tool-calling scorer for comparison
 *   npm run eval -- --only mem      # cases whose id starts with "mem"
 *
 * Mapping from the original scorer's fields:
 *   axes               -> analyzeAffect().axes (fast model, lexical fallback)
 *   confidence         -> readConfidence(): the same function the turn uses
 *   tone_word_mismatch -> analyzeAffect().masking > 0.4
 *   crisis_flag        -> deterministic patterns, raised by the model second opinion, tier >= passive
 *   matched_memory     -> model memory links from analyzeAffect() plus retrieve(), as in the turn
 *
 * Groq's free tier allows 8,000 tokens a minute on each model, so cases are paced.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeAffect } from "../lib/llm/analyze";
import { assessRisk, atLeast } from "../lib/safety/crisis";
import { secondOpinion, assessmentForTier } from "../lib/safety/secondOpinion";
import { newMemory, retrieve } from "../lib/memory";
import { complete, parseJsonObject } from "../lib/llm";
import { readConfidence } from "../lib/reading/confidence";
import { analyzeText } from "../lib/affect/textAffect";
import { octantFromVAD } from "../lib/affect/octant";

type Axes = Record<"joy" | "trust" | "fear" | "surprise" | "sadness" | "disgust" | "anger" | "anticipation", number>;
interface Expect { dominant_axes?: string[]; low_axes?: string[]; confidence_min?: number; confidence_max?: number; tone_word_mismatch?: boolean; requires_memory_lookup?: boolean; forbid_memory_lookup?: boolean; requires_crisis_flag?: boolean; forbid_crisis_flag?: boolean }
interface Case { id: string; category: string; message: string; expect: Expect }
interface Result { axes: Axes; confidence: number; tone_word_mismatch: boolean; crisis_flag: boolean; matched_memory: string[]; source?: string }

const here = path.dirname(fileURLToPath(import.meta.url));
const { cases, memory } = JSON.parse(fs.readFileSync(path.join(here, "eval-cases.json"), "utf8")) as { cases: Case[]; memory: string[] };
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const withScorer = args.includes("--scorer");
const PACE_MS = Number(process.env.EVAL_PACE_MS ?? 9000);
const MEMORY_FLOOR = Number(process.env.EVAL_MEMORY_FLOOR ?? 0.22);

const memItems = memory.map((m, i) => newMemory(i === 0 ? "person" : i === 1 ? "past" : i === 2 ? "goal" : "routine", m, 0.7, Date.now() - 20 * 86_400_000));

async function production(message: string): Promise<Result> {
  let risk = assessRisk(message);
  const second = await secondOpinion(message, risk);
  if (second.raised) risk = assessmentForTier(second.tier, risk, second.reason);
  const lex = analyzeText(message);
  const a = await analyzeAffect(message, [], { vad: lex.reading.vad, octant: octantFromVAD(lex.reading.vad) }, Date.now(), "en", memItems.map((m) => m.text));
  const linked = (a.memoryLinks ?? []).map((i) => memItems[i]?.text).filter(Boolean) as string[];
  const lexical = retrieve(memItems, [message, ...a.mentions].join(" "), 2).filter((r) => r.score >= MEMORY_FLOOR).map((r) => r.item.text);
  const confidence = readConfidence({ source: a.source, coverage: lex.reading.coverage, snapshot: 0, model: a.confidence, text: message });
  return { axes: a.axes as Axes, confidence, tone_word_mismatch: a.masking > 0.4, crisis_flag: atLeast(risk.tier, "passive"), matched_memory: [...new Set([...linked, ...lexical])], source: a.source };
}

/** The original standalone scorer, via JSON mode (tool calling works too; JSON keeps it provider-neutral). */
const SCORER = `You are MindEase's emotional-signal scorer. Read a single user message and score it against eight axes. Return JSON only:
{"axes": {"joy":0-1,"trust":0-1,"fear":0-1,"surprise":0-1,"sadness":0-1,"disgust":0-1,"anger":0-1,"anticipation":0-1}, "confidence": 0-1, "tone_word_mismatch": boolean, "crisis_flag": boolean, "matched_memory": [string]}
Rules:
- Do not take stated words at face value if tone, punctuation, repetition, or context suggests otherwise. "I'm fine" said flatly is not high-confidence joy or trust.
- If a message is genuinely low-signal or ambiguous, give LOW confidence. Do not invent a dominant emotion.
- Check the memory list for anything this message might connect to, even without a name or matching wording. Copy matching items exactly.
- crisis_flag should catch hopelessness and worthlessness framing, not only explicit self-harm statements.`;

async function scorer(message: string): Promise<Result> {
  const raw = await complete([{ role: "system", content: SCORER }, { role: "user", content: `Stored memory for this user:\n${memory.map((m) => `- ${m}`).join("\n")}\n\nMessage to score:\n"${message}"` }], { tier: "fast", json: true, temperature: 0, maxTokens: 700 });
  const j = parseJsonObject<Result>(raw);
  if (!j?.axes) throw new Error("scorer returned no axes");
  return { axes: j.axes, confidence: Number(j.confidence) || 0, tone_word_mismatch: !!j.tone_word_mismatch, crisis_flag: !!j.crisis_flag, matched_memory: Array.isArray(j.matched_memory) ? j.matched_memory : [] };
}

function check(exp: Expect, r: Result): string[] {
  const issues: string[] = [];
  const sorted = Object.entries(r.axes).sort((a, b) => b[1] - a[1]);
  if (exp.dominant_axes) {
    const top = sorted.slice(0, exp.dominant_axes.length + 1).map(([k]) => k);
    if (!exp.dominant_axes.some((a) => top.includes(a))) issues.push(`expected one of [${exp.dominant_axes}] near the top, got [${top}]`);
  }
  for (const a of exp.low_axes ?? []) if ((r.axes as Record<string, number>)[a] > 0.4) issues.push(`expected ${a} low, got ${(r.axes as Record<string, number>)[a]}`);
  if (exp.confidence_min !== undefined && r.confidence < exp.confidence_min) issues.push(`confidence ${r.confidence} < ${exp.confidence_min}`);
  if (exp.confidence_max !== undefined && r.confidence > exp.confidence_max) issues.push(`confidence ${r.confidence} > ${exp.confidence_max} (should be uncertain)`);
  if (exp.tone_word_mismatch !== undefined && r.tone_word_mismatch !== exp.tone_word_mismatch) issues.push(`tone_word_mismatch ${r.tone_word_mismatch}, expected ${exp.tone_word_mismatch}`);
  if (exp.requires_memory_lookup && r.matched_memory.length === 0) issues.push("no memory match for an oblique reference");
  if (exp.forbid_memory_lookup && r.matched_memory.length > 0) issues.push(`linked unrelated memory: ${r.matched_memory.join("; ")}`);
  if (exp.requires_crisis_flag && !r.crisis_flag) issues.push("crisis_flag false, expected true");
  if (exp.forbid_crisis_flag && r.crisis_flag) issues.push("crisis_flag true on a figure of speech");
  return issues;
}

async function run(label: string, fn: (m: string) => Promise<Result>) {
  const list = cases.filter((c) => !only || c.id.startsWith(only));
  let passed = 0; const byCat = new Map<string, [number, number]>(); const failures: { c: Case; issues: string[]; r?: Result }[] = [];
  console.log(`\n== ${label} (${list.length} cases) ==`);
  for (const [i, c] of list.entries()) {
    process.stdout.write(`[${c.id}] ${c.category} ... `);
    let issues: string[]; let r: Result | undefined;
    try { r = await fn(c.message); issues = check(c.expect, r); } catch (e) { issues = [(e as Error).message]; }
    const ok = issues.length === 0; if (ok) passed++;
    const cat = byCat.get(c.category) ?? [0, 0]; byCat.set(c.category, [cat[0] + (ok ? 1 : 0), cat[1] + 1]);
    console.log(ok ? "PASS" : `FAIL${r?.source === "fallback" ? " (model unavailable, lexical fallback)" : ""}`);
    if (!ok) failures.push({ c, issues, r });
    if (i < list.length - 1) await new Promise((res) => setTimeout(res, PACE_MS));
  }
  console.log(`\n${label}: ${passed}/${list.length} passed`);
  for (const f of failures) {
    console.log(`\n${f.c.id}: "${f.c.message}"`);
    f.issues.forEach((x) => console.log(`  - ${x}`));
    if (f.r) console.log(`  raw: ${JSON.stringify({ ...f.r, axes: Object.fromEntries(Object.entries(f.r.axes).map(([k, v]) => [k, Number(Number(v).toFixed(2))])) })}`);
  }
  return passed === list.length;
}

const okProd = await run("production pipeline", production);
const okScorer = withScorer ? await run("standalone scorer", scorer) : true;
if (!okProd || !okScorer) process.exitCode = 1;
