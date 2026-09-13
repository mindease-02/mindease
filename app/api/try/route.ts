import { NextResponse } from "next/server";
import { analyzeAffect } from "@/lib/llm/analyze";
import { analyzeText } from "@/lib/affect/textAffect";
import { octantFromVAD } from "@/lib/affect/octant";
import { isLanguage } from "@/lib/i18n";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * The landing page's "try the read": one line in, the eight-axis read out.
 * No account, nothing stored. Rate-limited per address so it cannot be used as
 * a free analysis endpoint; the limiter is per serverless instance, which is
 * enough to blunt casual abuse without adding a database.
 */
const hits = new Map<string, number[]>();
const WINDOW = 60_000, PER_MIN = 6, PER_DAY = 40;

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 24 * 3600_000);
  if (list.filter((t) => now - t < WINDOW).length >= PER_MIN || list.length >= PER_DAY) return NextResponse.json({ error: "limit" }, { status: 429 });
  list.push(now); hits.set(ip, list);

  const b = (await req.json().catch(() => ({}))) as { text?: string; language?: string };
  const text = (b.text ?? "").trim().slice(0, 300);
  if (text.length < 3) return NextResponse.json({ error: "empty" }, { status: 400 });
  const lex = analyzeText(text);
  const analysis = await analyzeAffect(text, [], { vad: lex.reading.vad, octant: octantFromVAD(lex.reading.vad) }, now, isLanguage(b.language) ? b.language : undefined);
  return NextResponse.json({
    axes: analysis.axes, states: analysis.states, why: analysis.why, need: analysis.need, intensity: analysis.intensity,
    masking: analysis.masking, maskingNote: analysis.maskingNote, source: analysis.source,
  });
}
