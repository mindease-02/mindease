/**
 * Voice channel.
 *
 * Raw acoustic features are extracted in the browser (components/useVoiceFeatures.ts)
 * so audio never leaves the device - only these ~9 numbers are transmitted. That is
 * a privacy decision first, but it is also why the feature set is deliberately
 * small and classical rather than a learned embedding: a learned embedding of
 * someone's voice is biometric data, and this application has no business holding it.
 *
 * Mapping rationale (speech-emotion + clinical speech literature):
 *  - Arousal is the well-attested axis: F0 mean, F0 range, intensity and speech
 *    rate all load on it consistently across corpora (IEMOCAP, RAVDESS, MSP-Podcast).
 *  - Valence from voice alone is weak. We extract it, weight it low, and say so.
 *  - Depressed speech has a specific and replicated signature: reduced F0
 *    variability (monotone), slowed rate, longer and more frequent pauses,
 *    reduced loudness (Cummins et al. 2015 review). That pattern maps to low
 *    arousal AND low dominance, which is exactly the state a valence-only system
 *    misses when someone types "I'm fine" in a flat voice.
 */
import type { Baseline } from "../util/stats";
import { squashZ, zScore } from "../util/stats";
import type { ChannelReading, VAD } from "./types";

/** Extracted client-side. All values are raw physical units, not normalised. */
export interface ProsodyFeatures {
  /** Median fundamental frequency over voiced frames, Hz. */
  f0Median: number;
  /** Interquartile range of F0, Hz. Collapses toward zero in monotone speech. */
  f0Iqr: number;
  /** RMS intensity of voiced frames, 0..1. */
  intensity: number;
  /** Standard deviation of frame intensity - dynamic range of delivery. */
  intensityVar: number;
  /** Voiced frames per second of speech - a proxy for articulation rate. */
  speechRate: number;
  /** Fraction of the utterance that is silence longer than 250 ms. */
  pauseRatio: number;
  /** Mean duration of those pauses, seconds. Lengthens with psychomotor slowing. */
  meanPauseMs: number;
  /** Cycle-to-cycle F0 perturbation, %. Rises with vocal tension and distress. */
  jitter: number;
  /** Spectral centroid, Hz. Higher = brighter; falls with low-energy speech. */
  spectralCentroid: number;
  /** Seconds of voiced audio this reading is based on. */
  voicedSeconds: number;
}

export interface ProsodyBaselines {
  f0Median: Baseline;
  f0Iqr: Baseline;
  intensity: Baseline;
  speechRate: Baseline;
  pauseRatio: Baseline;
  meanPauseMs: Baseline;
  jitter: Baseline;
  spectralCentroid: Baseline;
}

/**
 * Below this there is not enough voiced audio to say anything. We return a
 * zero-precision reading rather than a confident guess, and the fusion step
 * ignores it automatically.
 */
const MIN_VOICED_SECONDS = 1.8;

export function prosodyReading(
  f: ProsodyFeatures,
  base: ProsodyBaselines,
  at = Date.now(),
): ChannelReading {
  const dead: ChannelReading = {
    channel: "prosody",
    vad: { valence: 0, arousal: 0, dominance: 0 },
    precision: { valence: 0, arousal: 0, dominance: 0 },
    coverage: 0,
    at,
    detail: { reason: "insufficient voiced audio", voicedSeconds: f.voicedSeconds },
  };
  if (f.voicedSeconds < MIN_VOICED_SECONDS) return dead;

  const z = {
    f0: zScore(base.f0Median, f.f0Median),
    f0Iqr: zScore(base.f0Iqr, f.f0Iqr),
    intensity: zScore(base.intensity, f.intensity),
    rate: zScore(base.speechRate, f.speechRate),
    pause: zScore(base.pauseRatio, f.pauseRatio),
    pauseLen: zScore(base.meanPauseMs, f.meanPauseMs),
    jitter: zScore(base.jitter, f.jitter),
    centroid: zScore(base.spectralCentroid, f.spectralCentroid),
  };

  // How many baselines are actually established? Everything scales off this.
  const known = Object.values(z).filter((v) => v !== null).length;
  if (known < 3) {
    return { ...dead, detail: { reason: "personal baseline not established", knownFeatures: known } };
  }
  const zv = (k: keyof typeof z) => z[k] ?? 0;

  // Arousal: pitch height, pitch variability, loudness and rate all push up;
  // pausing pushes down. This is the axis voice is genuinely good at.
  const arousalRaw =
    0.28 * zv("f0") + 0.22 * zv("f0Iqr") + 0.26 * zv("intensity") +
    0.24 * zv("rate") - 0.20 * zv("pause") - 0.16 * zv("pauseLen");

  // Valence: brightness and pitch variation up, vocal perturbation down. Weak on
  // its own - we keep the weight low and let text dominate this axis.
  const valenceRaw = 0.30 * zv("f0Iqr") + 0.22 * zv("centroid") - 0.34 * zv("jitter") + 0.14 * zv("intensity");

  // Dominance: projection and fluency. Long pauses and quiet, monotone delivery
  // read as low agency - the clinical "psychomotor retardation" pattern.
  const dominanceRaw = 0.34 * zv("intensity") + 0.24 * zv("rate") + 0.20 * zv("f0Iqr") - 0.30 * zv("pauseLen");

  const vad: VAD = {
    valence: squashZ(valenceRaw),
    arousal: squashZ(arousalRaw),
    dominance: squashZ(dominanceRaw),
  };

  // Precision grows with audio duration and baseline completeness, and saturates.
  const dur = Math.min(1, f.voicedSeconds / 12);
  const cov = dur * (known / 8);
  const p = 3.2 * cov;

  return {
    channel: "prosody",
    vad,
    precision: {
      valence: p * 0.35,   // deliberately low: voice valence is not reliable alone
      arousal: p * 1.0,
      dominance: p * 0.7,
    },
    coverage: cov,
    at,
    detail: {
      voicedSeconds: Number(f.voicedSeconds.toFixed(1)),
      f0IqrZ: Number((z.f0Iqr ?? 0).toFixed(2)),
      rateZ: Number((z.rate ?? 0).toFixed(2)),
      pauseLenZ: Number((z.pauseLen ?? 0).toFixed(2)),
      intensityZ: Number((z.intensity ?? 0).toFixed(2)),
      // The named pattern, when it is present, so the Mirror panel can show it in words.
      pattern: monotonePattern(z) ? "flattened prosody (monotone, slowed, longer pauses)" : "none",
    },
  };
}

/** The reduced-variability / slowed-rate / long-pause triad, all at once. */
function monotonePattern(z: Record<string, number | null>): boolean {
  const low = (k: string, t = -0.8) => (z[k] ?? 0) < t;
  const high = (k: string, t = 0.8) => (z[k] ?? 0) > t;
  let hits = 0;
  if (low("f0Iqr")) hits++;
  if (low("rate")) hits++;
  if (high("pauseLen")) hits++;
  if (low("intensity")) hits++;
  return hits >= 3;
}

export function emptyProsodyBaselines(): ProsodyBaselines {
  const e = () => ({ samples: [], center: 0, spread: 0, n: 0 });
  return {
    f0Median: e(), f0Iqr: e(), intensity: e(), speechRate: e(),
    pauseRatio: e(), meanPauseMs: e(), jitter: e(), spectralCentroid: e(),
  };
}
