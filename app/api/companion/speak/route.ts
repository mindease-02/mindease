import { NextResponse } from "next/server";
import { synthesize } from "@/lib/companion/voice";
import { isResponse, withCompanion } from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Text → speech in the companion's configured voice. 204 when no provider is
 * configured, so the client can fall back to the browser's synthesis or text.
 * Keys and provider voice ids never leave the server.
 */
export async function POST(req: Request) {
  const c = await withCompanion();
  if (isResponse(c)) return c;
  const { text, voice } = (await req.json().catch(() => ({}))) as { text?: string; voice?: Partial<typeof c.profile.voice> };
  if (!text?.trim()) return NextResponse.json({ error: "no text" }, { status: 400 });
  const cfg = { ...c.profile.voice, ...(voice ?? {}) };
  try {
    const r = await synthesize(text, cfg);
    return r ?? new Response(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
