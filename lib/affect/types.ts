/**
 * Core affect representation.
 *
 * We deliberately do NOT model "the user's emotion" as a single label. Discrete
 * emotion labels are an inference convenience; the underlying state we track is
 * dimensional (Russell's circumplex extended to VAD - Mehrabian & Russell 1974),
 * because trend detection over a continuous latent is far better posed than
 * trend detection over an argmax label that flips categories turn to turn.
 */
export interface VAD {
  /** Valence: -1 (aversive) .. +1 (appetitive). The axis wellbeing lives on. */
  valence: number;
  /** Arousal: -1 (torpid/flat) .. +1 (activated). Separates agitated from numb. */
  arousal: number;
  /** Dominance / agency: -1 (helpless) .. +1 (in control). Tracks learned helplessness. */
  dominance: number;
}

/** 1 / variance. Higher = this reading is more trustworthy. Drives Bayesian fusion. */
export interface Precision {
  valence: number;
  arousal: number;
  dominance: number;
}

export type Channel = "text" | "prosody" | "typing" | "rhythm" | "self_report";

export interface ChannelReading {
  channel: Channel;
  vad: VAD;
  precision: Precision;
  /** 0..1 - how much signal was actually present (a 3-word turn => low). */
  coverage: number;
  at: number;
  /** Per-channel detail, surfaced verbatim in the Mirror panel. */
  detail?: Record<string, number | string>;
}

/** GoEmotions taxonomy (Demszky et al. 2020) - 27 emotions + neutral. */
export const EMOTION_LABELS = [
  "admiration", "amusement", "anger", "annoyance", "approval", "caring",
  "confusion", "curiosity", "desire", "disappointment", "disapproval",
  "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
  "joy", "love", "nervousness", "optimism", "pride", "realization",
  "relief", "remorse", "sadness", "surprise", "neutral",
] as const;
export type EmotionLabel = (typeof EMOTION_LABELS)[number];

export interface EmotionDistribution {
  /** Multi-label probabilities, NOT a simplex - GoEmotions allows co-occurrence. */
  probs: Partial<Record<EmotionLabel, number>>;
  top: { label: EmotionLabel; p: number }[];
}

/** Psycholinguistic markers with replicated links to depressive symptomatology. */
export interface LinguisticMarkers {
  /** Rate of I/me/my. Elevated first-person singular is among the most
   *  reproducible correlates of depression (Edwards & Holtzman 2017, meta-analysis). */
  firstPersonSingular: number;
  /** we/us/our - social integration proxy; falls as withdrawal deepens. */
  firstPersonPlural: number;
  /** always/never/completely - absolutist words separate depression and SI forums
   *  from controls more sharply than negative-affect words does
   *  (Al-Mosaiwi & Johnstone 2018). */
  absolutist: number;
  /** should/must/have to - self-directed obligation, cognitive-distortion proxy. */
  obligation: number;
  /** past-tense share; rumination skews retrospective. */
  pastFocus: number;
  /** future-tense share; hopelessness flattens forward reference (Beck 1974). */
  futureFocus: number;
  /** length-corrected type/token ratio. Falls with psychomotor slowing / anhedonia. */
  lexicalDiversity: number;
  /** negation density. */
  negation: number;
  /** cognitive-process words (because, realise, understand) - processing proxy. */
  cognitiveProcess: number;
  /** social-reference words (friend, mum, they, together) - connection proxy. */
  socialReference: number;
  tokens: number;
}

export interface AffectSnapshot {
  at: number;
  /** Posterior latent state after fusing every channel present in this turn. */
  vad: VAD;
  precision: Precision;
  emotions: EmotionDistribution;
  markers: LinguisticMarkers;
  readings: ChannelReading[];
  /** 0..1 overall confidence. Gates whether the system is allowed to act on it. */
  confidence: number;
}

export const ZERO_VAD: VAD = { valence: 0, arousal: 0, dominance: 0 };
