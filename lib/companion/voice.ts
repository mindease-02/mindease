/**
 * Server-side voice provider. The only place provider voice ids and keys are
 * read. Returns null when nothing is configured so the route can answer 204
 * and the client falls back to the browser's own synthesis, then to text.
 *
 * Catalogue ids (lib/companion/voices.ts) map to ElevenLabs premade voices by
 * default; override any of them with ELEVENLABS_VOICE_<ID> (e.g.
 * ELEVENLABS_VOICE_WARM_F=...) to use your own.
 */
import type { VoiceConfig } from "./types";

const DEFAULT_PROVIDER_IDS: Record<string, string> = {
  "warm-f": "EXAVITQu4vr4xnSDxMaL",   // Sarah
  "bright-f": "FGY2WhTYpPnrIDTdsKH5", // Laura
  "soft-f": "XB0fDUnXU5powFXDhCwa",   // Charlotte
  "calm-m": "JBFqnCBsd6RMkjVDRZzb",   // George
  "deep-m": "nPczCjzI2devNBz1zQrb",   // Brian
  "warm-m": "TX3LPaxmHKxFdv7VOQHJ",   // Liam
  "soft-m": "IKne3meq5aSn8XLyUdCD",   // Charlie
  "bright-n": "SAz9YHcvj6GT2YYXdXww", // River
};

export function voiceConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

function providerVoiceId(catalogueId: string): string {
  const env = process.env[`ELEVENLABS_VOICE_${catalogueId.toUpperCase().replace(/-/g, "_")}`];
  return env || DEFAULT_PROVIDER_IDS[catalogueId] || DEFAULT_PROVIDER_IDS["warm-f"];
}

/** Synthesize speech. Resolves to null when no provider is configured. */
export async function synthesize(text: string, voice: VoiceConfig): Promise<Response | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  const id = providerVoiceId(voice.voiceId);
  // Energy → less stability, more style; speed passes straight through (provider range 0.7..1.2).
  const stability = Math.max(0.2, Math.min(0.9, 0.8 - voice.energy * 0.5));
  const style = Math.max(0, Math.min(0.6, voice.energy * 0.5));
  const speed = Math.max(0.7, Math.min(1.2, voice.speed));
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text.slice(0, 1500), model_id: "eleven_turbo_v2_5",
      voice_settings: { stability, similarity_boost: 0.7, style, use_speaker_boost: false, speed },
    }),
  });
  if (!r.ok) throw new Error(`tts ${r.status}`);
  return new Response(r.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
