/**
 * Voice catalogue. Client-safe: it holds labels and hints for the browser
 * fallback only. Provider voice ids live server-side in lib/companion/voice.ts
 * and are never sent to the browser.
 */
export interface VoiceOption {
  id: string;
  label: string;
  presentation: "female" | "male" | "neutral";
  blurb: string;
  /** Regex used to pick a matching browser SpeechSynthesis voice when no provider is configured. */
  browserHint: string;
  /** Default pitch for the browser fallback. */
  pitch: number;
}

export const VOICES: VoiceOption[] = [
  { id: "warm-f", label: "Warm", presentation: "female", blurb: "Low, unhurried, close to the mic.", browserHint: "samantha|karen|moira|serena|female", pitch: 1.0 },
  { id: "bright-f", label: "Bright", presentation: "female", blurb: "Lighter, quicker, a smile in it.", browserHint: "zira|tessa|fiona|female", pitch: 1.12 },
  { id: "soft-f", label: "Soft", presentation: "female", blurb: "Quiet and even. Good for late.", browserHint: "victoria|allison|ava|female", pitch: 0.95 },
  { id: "calm-m", label: "Calm", presentation: "male", blurb: "Level, warm, slightly dry.", browserHint: "daniel|tom|alex|male", pitch: 0.9 },
  { id: "deep-m", label: "Deep", presentation: "male", blurb: "Lower register, slower pace.", browserHint: "fred|bruce|lee|male", pitch: 0.78 },
  { id: "warm-m", label: "Warm", presentation: "male", blurb: "Friendly, mid-pitch, easy.", browserHint: "aaron|oliver|arthur|male", pitch: 0.95 },
  { id: "soft-m", label: "Soft", presentation: "male", blurb: "Gentle, almost a murmur.", browserHint: "rishi|ralph|male", pitch: 0.88 },
  { id: "bright-n", label: "Bright", presentation: "neutral", blurb: "Clear and light, hard to place.", browserHint: "flo|sandy|reed|eddy", pitch: 1.05 },
];

export function voiceById(id: string): VoiceOption {
  return VOICES.find((v) => v.id === id) ?? VOICES[0];
}
