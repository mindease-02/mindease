/**
 * Build DPO pairs from the live system: 4 candidates per prompt, judged by the
 * rubric, best vs worst written as JSONL for training/dpo_lora.py.
 *
 *   npx tsx scripts/build-preference-pairs.ts out/pairs.jsonl [prompts.jsonl]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { complete } from "../lib/llm";
import { buildSystemPrompt } from "../lib/prompt/persona";
import { assessRisk } from "../lib/safety/crisis";
import { SAMPLE_PROMPTS } from "./rubric";
import { judge } from "./judge-empathy";

if (!process.env.GROQ_API_KEY && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  const out = process.argv[2] ?? "out/pairs.jsonl";
  const prompts: { message: string }[] = process.argv[3]
    ? readFileSync(process.argv[3], "utf8").trim().split("\n").map((l) => JSON.parse(l))
    : SAMPLE_PROMPTS;
  mkdirSync(dirname(out), { recursive: true });
  const lines: string[] = [];
  for (const p of prompts) {
    const system = buildSystemPrompt({ risk: assessRisk(p.message), allowBehaviouralSignals: false, displayName: "Sam" });
    const msgs = [{ role: "system" as const, content: system }, { role: "user" as const, content: p.message }];
    const cands = await Promise.all([0, 1, 2, 3].map(() => complete(msgs, { tier: "chat", temperature: 0.95, maxTokens: 400 })));
    const scored = await Promise.all(cands.map(async (c) => ({ c, j: await judge(p.message, c) })));
    const ok = scored.filter((s) => s.j).sort((a, b) => b.j!.overall - a.j!.overall);
    if (ok.length < 2 || ok[0].j!.overall - ok[ok.length - 1].j!.overall < 2) { console.log(`skip (no clear preference): ${p.message.slice(0, 50)}`); continue; }
    lines.push(JSON.stringify({ prompt: msgs, chosen: ok[0].c, rejected: ok[ok.length - 1].c, scores: [ok[0].j!.overall, ok[ok.length - 1].j!.overall] }));
    console.log(`pair ${ok[0].j!.overall} vs ${ok[ok.length - 1].j!.overall}: ${p.message.slice(0, 50)}`);
  }
  writeFileSync(out, lines.join("\n") + "\n");
  console.log(`wrote ${lines.length} pairs to ${out}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
