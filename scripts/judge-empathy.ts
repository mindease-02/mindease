/**
 * Generate MindEase's reply for each sample prompt through the real system prompt,
 * then score it with the rubric. Needs GROQ_API_KEY in .env.local.
 *
 *   npx tsx scripts/judge-empathy.ts            # sample prompts
 *   npx tsx scripts/judge-empathy.ts pairs.jsonl # score {"message","reply"} rows
 */
import { readFileSync, existsSync } from "node:fs";
import { complete, parseJsonObject } from "../lib/llm";
import { buildSystemPrompt } from "../lib/prompt/persona";
import { assessRisk } from "../lib/safety/crisis";
import { RUBRIC, SAMPLE_PROMPTS } from "./rubric";

loadEnv();

async function reply(message: string): Promise<string> {
  const system = buildSystemPrompt({ risk: assessRisk(message), allowBehaviouralSignals: false, displayName: "Sam" });
  return complete([{ role: "system", content: system }, { role: "user", content: message }], { tier: "chat", temperature: 0.7, maxTokens: 400 });
}

export async function judge(message: string, replyText: string) {
  const raw = await complete([
    { role: "system", content: RUBRIC },
    { role: "user", content: `Person: ${message}\n\nCompanion: ${replyText}` },
  ], { tier: "fast", json: true, temperature: 0, maxTokens: 400 });
  return parseJsonObject<{ emotional_reaction: number; interpretation: number; exploration: number; violations: string[]; overall: number; note: string }>(raw);
}

async function main() {
  const file = process.argv[2];
  const rows: { message: string; reply?: string }[] = file
    ? readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l))
    : SAMPLE_PROMPTS.map((p) => ({ message: p.message }));
  let total = 0, n = 0;
  for (const row of rows) {
    const r = row.reply ?? await reply(row.message);
    const j = await judge(row.message, r);
    if (!j) continue;
    total += j.overall; n++;
    console.log(`\n> ${row.message}\n< ${r}\n  ER ${j.emotional_reaction} · IP ${j.interpretation} · EX ${j.exploration} · overall ${j.overall}/10${j.violations?.length ? " · violations: " + j.violations.join(", ") : ""}\n  ${j.note}`);
  }
  console.log(`\nmean overall ${(total / Math.max(1, n)).toFixed(2)} over ${n} replies`);
}

function loadEnv() {
  if (process.env.GROQ_API_KEY || !existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (process.argv[1]?.endsWith("judge-empathy.ts")) main().catch((e) => { console.error(e); process.exit(1); });
