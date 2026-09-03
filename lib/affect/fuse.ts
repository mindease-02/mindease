/**
 * Precision-weighted fusion of the channels into one latent affect state.
 *
 * For independent Gaussian observations of the same latent, the posterior mean is
 * the precision-weighted average and the posterior precision is the sum. That is
 * all this is - but stating it that way buys two things a hand-tuned weighted
 * average does not:
 *
 *  1. Channels that saw no evidence contribute nothing, automatically. A silent
 *     mic and an unestablished baseline both emit precision 0 and drop out. No
 *     special-casing, no "if voice then 0.3" constants to maintain.
 *
 *  2. Posterior precision is a first-class output, so downstream code can refuse
 *     to act on a thin estimate. In a system that decides whether to interrupt
 *     someone who may be depressed, "how sure am I" has to be a number, not a vibe.
 *
 * INCONGRUENCE is the reason multimodality is here at all. When the text channel
 * says "fine" and the voice and typing channels say otherwise, the disagreement is
 * more informative than either channel. We do not resolve it by picking a winner:
 * we lower confidence in the fused point estimate, record the conflict, and let
 * the companion ask about it out loud. "You said you're okay, and you might be -
 * you also sound flatter than usual" is an honest thing to say. Silently
 * overriding someone's self-report with a pitch tracker is not.
 */
import type { AffectSnapshot, ChannelReading, EmotionDistribution, LinguisticMarkers, Precision, VAD } from "./types";

/** Weak zero-mean prior. Stops a single thin reading from claiming an extreme state. */
const PRIOR_PRECISION = 0.6;

export interface Incongruence {
  present: boolean;
  /** Signed gap: positive = self-presentation is rosier than behavioural signal. */
  magnitude: number;
  statedChannel: "text";
  conflictingChannels: string[];
  description: string;
}

export interface FusionResult {
  vad: VAD;
  precision: Precision;
  confidence: number;
  incongruence: Incongruence;
}

export function fuse(readings: ChannelReading[]): FusionResult {
  const axes = ["valence", "arousal", "dominance"] as const;
  const vad = {} as VAD;
  const precision = {} as Precision;

  for (const axis of axes) {
    let num = 0;
    let den = PRIOR_PRECISION; // prior mean is 0, so it adds nothing to the numerator
    for (const r of readings) {
      const p = r.precision[axis];
      if (!(p > 0)) continue;
      num += p * r.vad[axis];
      den += p;
    }
    vad[axis] = num / den;
    precision[axis] = den;
  }

  const incongruence = detectIncongruence(readings);

  // Confidence: mostly driven by valence precision (the axis everything downstream
  // keys off), penalised when channels contradict each other.
  const raw = 1 - Math.exp(-precision.valence / 3.5);
  const confidence = Math.max(0, Math.min(1, raw * (1 - 0.45 * Math.min(1, Math.abs(incongruence.magnitude)))));

  return { vad, precision, confidence, incongruence };
}

const NONE: Incongruence = {
  present: false, magnitude: 0, statedChannel: "text",
  conflictingChannels: [], description: "",
};

function detectIncongruence(readings: ChannelReading[]): Incongruence {
  const text = readings.find((r) => r.channel === "text");
  if (!text || text.precision.valence <= 0.3) return NONE;

  const behavioural = readings.filter(
    (r) => r.channel !== "text" && r.channel !== "self_report" && r.coverage > 0.25,
  );
  if (!behavioural.length) return NONE;

  // Compare on the axes the behavioural channels are actually good at. Comparing
  // voice-valence to text-valence would mostly measure our own weak valence model.
  const behaviouralTone = behavioural.reduce((acc, r) => {
    const w = r.precision.arousal + r.precision.dominance;
    return acc + w * (0.45 * r.vad.arousal + 0.55 * r.vad.dominance);
  }, 0) / behavioural.reduce((s, r) => s + r.precision.arousal + r.precision.dominance, 0);

  const stated = 0.6 * text.vad.valence + 0.4 * text.vad.dominance;
  const gap = stated - behaviouralTone;

  // Only the "presenting better than behaving" direction matters here. The reverse
  // (venting hard while sounding energetic) is normal and not worth flagging.
  if (gap < 0.55) return NONE;

  return {
    present: true,
    magnitude: gap,
    statedChannel: "text",
    conflictingChannels: behavioural.map((r) => r.channel),
    description:
      `What you wrote reads more settled than how you said it. ` +
      `Words: ${fmt(stated)}. Voice/typing: ${fmt(behaviouralTone)}.`,
  };
}

const fmt = (x: number) =>
  x > 0.35 ? "upbeat" : x > 0.1 ? "mildly positive" : x > -0.1 ? "neutral" : x > -0.35 ? "subdued" : "low";

export function buildSnapshot(
  readings: ChannelReading[],
  emotions: EmotionDistribution,
  markers: LinguisticMarkers,
  at = Date.now(),
): AffectSnapshot & { incongruence: Incongruence } {
  const f = fuse(readings);
  return {
    at,
    vad: f.vad,
    precision: f.precision,
    emotions,
    markers,
    readings,
    confidence: f.confidence,
    incongruence: f.incongruence,
  };
}
