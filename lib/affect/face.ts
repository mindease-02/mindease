/**
 * Face channel.
 *
 * The browser runs MediaPipe's Face Landmarker and reduces its 52 blendshape
 * scores to two numbers per message - valence and arousal - plus how many
 * frames they came from. No image, landmark or embedding ever leaves the device.
 *
 * It is the weakest channel on purpose: expression is heavily socially
 * managed, models are less accurate across ages and skin tones, and a webcam
 * angle changes everything. Precision is capped low, valence gets most of it
 * (smile/frown geometry is the one thing this is decent at), and it never
 * carries incongruence on its own.
 */
import type { ChannelReading } from "./types";

export interface FaceFeatures {
  valence: number;
  arousal: number;
  /** 0..1 - tracking confidence × fraction of frames with a face. */
  confidence: number;
  frames: number;
}

const MIN_FRAMES = 8;

export function faceReading(f: FaceFeatures, at = Date.now()): ChannelReading {
  const dead: ChannelReading = {
    channel: "face", vad: { valence: 0, arousal: 0, dominance: 0 },
    precision: { valence: 0, arousal: 0, dominance: 0 }, coverage: 0, at,
    detail: { reason: "too few frames with a face", frames: f.frames },
  };
  if (f.frames < MIN_FRAMES || f.confidence < 0.3) return dead;
  const cov = Math.min(1, f.frames / 40) * f.confidence;
  const p = 1.4 * cov;
  return {
    channel: "face",
    vad: { valence: clamp(f.valence), arousal: clamp(f.arousal), dominance: 0 },
    precision: { valence: p * 0.8, arousal: p * 0.5, dominance: 0 },
    coverage: cov,
    at,
    detail: {
      frames: f.frames, confidence: Number(f.confidence.toFixed(2)),
      expression: f.valence > 0.25 ? "smiling" : f.valence < -0.25 ? "frowning / tense" : "neutral",
    },
  };
}

const clamp = (x: number) => Math.max(-1, Math.min(1, x));
