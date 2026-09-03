import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/** ElevenLabs TTS proxy. Returns 204 when not configured so the client falls back to SpeechSynthesis. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response(null, { status: 204 });
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text) return NextResponse.json({ error: "no text" }, { status: 400 });
  const voice = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text.slice(0, 1200), model_id: "eleven_turbo_v2_5",
      voice_settings: { stability: 0.55, similarity_boost: 0.7, style: 0.15, use_speaker_boost: false },
    }),
  });
  if (!r.ok) return NextResponse.json({ error: `tts ${r.status}` }, { status: 502 });
  return new Response(r.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
