import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { sanitizeSettings } from "@/lib/companion/profile";
import { companionBlock, previewLines } from "@/lib/companion/prompt";
import { buildSystemPrompt } from "@/lib/prompt/persona";
import { complete, llmConfig } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * A four-line sample exchange in the draft companion's style, for the setup
 * flow. Nothing is stored. Falls back to a deterministic preview if the model
 * is unavailable, so the step never blocks.
 */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const settings = sanitizeSettings(await req.json().catch(() => ({})));
  const fallback = previewLines(settings, session.name);
  if (!llmConfig()) return NextResponse.json({ lines: fallback, source: "fallback" });
  try {
    const system = buildSystemPrompt({ allowBehaviouralSignals: false, displayName: session.name, companion: { name: settings.name, block: companionBlock(settings, session.name, []) } });
    const a = await complete([{ role: "system", content: system }, { role: "user", content: "today was kinda weird" }], { tier: "chat", temperature: 0.8, maxTokens: 80 });
    const b = await complete([{ role: "system", content: system }, { role: "user", content: "today was kinda weird" }, { role: "assistant", content: a }, { role: "user", content: "just everything felt off" }], { tier: "chat", temperature: 0.8, maxTokens: 120 });
    const tidy = (s: string) => s.replace(/^\s*[A-Za-z]+\s*:\s*/, "").trim();
    return NextResponse.json({ lines: [fallback[0], { role: "assistant", content: tidy(a) || fallback[1].content }, fallback[2], { role: "assistant", content: tidy(b) || fallback[3].content }], source: "model" });
  } catch {
    return NextResponse.json({ lines: fallback, source: "fallback" });
  }
}
