/**
 * The text channel: turns one message into a VAD reading, an emotion
 * distribution, and a marker profile.
 *
 * Precision (not just the point estimate) is the important output here. A
 * four-word message and a four-paragraph message both produce a valence number;
 * only one of them should be allowed to move the user's tracked mood state. We
 * express that as precision so downstream fusion handles it principled rather
 * than by ad-hoc thresholds sprinkled through the app.
 */
import { predictEmotions, predictVAD, type SparseLinearModel } from "./classifier";
import { INTENSIFIERS, MARKER_SETS, VAD_LEXICON } from "./lexicon";
import { tokenize } from "./tokenize";
import type { ChannelReading, EmotionDistribution, LinguisticMarkers, VAD } from "./types";
import { EMOTION_LABELS } from "./types";

/**
 * Where each GoEmotions label sits in VAD space. Used to project the emotion
 * head onto the dimensional state, which lets the two heads cross-check each
 * other: when they disagree, precision drops and the system waits for more.
 */
const EMOTION_VAD: Record<string, [number, number, number]> = {
  admiration: [0.7, 0.35, 0.25], amusement: [0.75, 0.5, 0.45], anger: [-0.65, 0.75, 0.2],
  annoyance: [-0.45, 0.45, 0.1], approval: [0.5, 0.1, 0.35], caring: [0.65, 0.2, 0.35],
  confusion: [-0.25, 0.3, -0.45], curiosity: [0.35, 0.45, 0.3], desire: [0.4, 0.5, 0.1],
  disappointment: [-0.6, -0.2, -0.4], disapproval: [-0.45, 0.25, 0.15], disgust: [-0.65, 0.4, 0.1],
  embarrassment: [-0.55, 0.45, -0.5], excitement: [0.75, 0.8, 0.55], fear: [-0.72, 0.7, -0.65],
  gratitude: [0.8, 0.25, 0.4], grief: [-0.85, -0.25, -0.6], joy: [0.85, 0.6, 0.6],
  love: [0.88, 0.5, 0.45], nervousness: [-0.5, 0.6, -0.5], optimism: [0.7, 0.35, 0.6],
  pride: [0.78, 0.5, 0.8], realization: [0.05, 0.3, 0.25], relief: [0.65, -0.25, 0.45],
  remorse: [-0.65, 0.1, -0.55], sadness: [-0.8, -0.35, -0.5], surprise: [0.15, 0.7, -0.1],
  neutral: [0, -0.1, 0],
};

export function extractMarkers(words: string[]): LinguisticMarkers {
  const n = words.length;
  if (n === 0) {
    return {
      firstPersonSingular: 0, firstPersonPlural: 0, absolutist: 0, obligation: 0,
      pastFocus: 0, futureFocus: 0, lexicalDiversity: 0, negation: 0,
      cognitiveProcess: 0, socialReference: 0, tokens: 0,
    };
  }
  const count = (s: ReadonlySet<string>) => words.reduce((a, w) => a + (s.has(w) ? 1 : 0), 0);
  const uniq = new Set(words).size;

  return {
    firstPersonSingular: count(MARKER_SETS.firstPersonSingular) / n,
    firstPersonPlural: count(MARKER_SETS.firstPersonPlural) / n,
    absolutist: count(MARKER_SETS.absolutist) / n,
    obligation: count(MARKER_SETS.obligation) / n,
    pastFocus: count(MARKER_SETS.past) / n,
    futureFocus: count(MARKER_SETS.future) / n,
    // Root TTR (Guiraud's index, rescaled): plain type/token falls with length
    // for purely mechanical reasons, which would fake a "declining diversity" trend
    // in anyone who simply started writing longer messages.
    lexicalDiversity: Math.min(1, uniq / Math.sqrt(n) / 4),
    negation: count(MARKER_SETS.negation) / n,
    cognitiveProcess: count(MARKER_SETS.cognitiveProcess) / n,
    socialReference: count(MARKER_SETS.socialReference) / n,
    tokens: n,
  };
}

/** Lexicon-only VAD. Used as the fallback head and as a sanity check on the model. */
export function lexiconVAD(words: string[]): { vad: VAD; hits: number } {
  let v = 0, a = 0, d = 0, hits = 0;
  for (let i = 0; i < words.length; i++) {
    const entry = VAD_LEXICON[words[i]];
    if (!entry) continue;
    let mult = 1;
    if (i > 0 && INTENSIFIERS[words[i - 1]]) mult = INTENSIFIERS[words[i - 1]];
    if (i > 0 && MARKER_SETS.negation.has(words[i - 1])) mult *= -0.75;
    v += entry[0] * mult;
    a += entry[1] * Math.abs(mult);
    d += entry[2] * mult;
    hits++;
  }
  if (hits === 0) return { vad: { valence: 0, arousal: 0, dominance: 0 }, hits: 0 };
  // Mean, then a mild saturating squash so a rant full of negative words does not
  // peg the estimate at -1 and destroy all downstream resolution.
  const squash = (x: number) => Math.tanh((x / hits) * 1.15);
  return { vad: { valence: squash(v), arousal: squash(a), dominance: squash(d) }, hits };
}

/** Project the multi-label emotion head onto VAD, weighted by probability. */
export function emotionsToVAD(dist: EmotionDistribution): { vad: VAD; mass: number } {
  let v = 0, a = 0, d = 0, mass = 0;
  for (const label of EMOTION_LABELS) {
    const p = dist.probs[label] ?? 0;
    if (p < 0.12) continue; // below this, one-vs-rest heads are mostly noise
    const e = EMOTION_VAD[label];
    if (!e) continue;
    const w = label === "neutral" ? p * 0.4 : p; // neutral should not dominate the mean
    v += e[0] * w; a += e[1] * w; d += e[2] * w; mass += w;
  }
  if (mass === 0) return { vad: { valence: 0, arousal: 0, dominance: 0 }, mass: 0 };
  return { vad: { valence: v / mass, arousal: a / mass, dominance: d / mass }, mass };
}

export interface TextAnalysis {
  reading: ChannelReading;
  emotions: EmotionDistribution;
  markers: LinguisticMarkers;
}

export interface TextModels {
  emotion?: SparseLinearModel;
  vad?: SparseLinearModel;
}

export function analyzeText(text: string, models: TextModels = {}, at = Date.now()): TextAnalysis {
  const { words } = tokenize(text);
  const markers = extractMarkers(words);

  const emotions: EmotionDistribution = models.emotion
    ? predictEmotions(models.emotion, text)
    : { probs: {}, top: [] };

  const lex = lexiconVAD(words);
  const emo = emotionsToVAD(emotions);
  const mdl = models.vad ? predictVAD(models.vad, text) : null;

  // Combine the available heads by how much evidence each actually saw.
  const parts: { vad: VAD; w: number }[] = [];
  if (mdl) parts.push({ vad: mdl, w: 1.0 });
  if (emo.mass > 0) parts.push({ vad: emo.vad, w: Math.min(1, emo.mass) * 0.9 });
  if (lex.hits > 0) parts.push({ vad: lex.vad, w: Math.min(1, lex.hits / 4) * (mdl ? 0.35 : 0.9) });

  const totalW = parts.reduce((s, p) => s + p.w, 0) || 1;
  const vad: VAD = {
    valence: parts.reduce((s, p) => s + p.vad.valence * p.w, 0) / totalW,
    arousal: parts.reduce((s, p) => s + p.vad.arousal * p.w, 0) / totalW,
    dominance: parts.reduce((s, p) => s + p.vad.dominance * p.w, 0) / totalW,
  };

  // Disagreement between independent heads is the honest uncertainty signal.
  let spread = 0;
  if (parts.length > 1) {
    for (const p of parts) spread += Math.abs(p.vad.valence - vad.valence) * p.w;
    spread /= totalW;
  }

  // Coverage: how much evidence this turn carried at all. Log-scaled because the
  // 5th word tells you far more than the 80th.
  const coverage = Math.min(1, Math.log1p(markers.tokens) / Math.log1p(45)) *
    (parts.length === 0 ? 0.15 : 1);

  // Precision = evidence, discounted by head disagreement.
  const base = 4 * coverage * (1 - Math.min(0.8, spread));
  const reading: ChannelReading = {
    channel: "text",
    vad,
    precision: {
      valence: Math.max(0.05, base),
      arousal: Math.max(0.05, base * 0.7),  // arousal is genuinely harder from text alone
      dominance: Math.max(0.05, base * 0.6),
    },
    coverage,
    at,
    detail: {
      tokens: markers.tokens,
      lexiconHits: lex.hits,
      headSpread: Number(spread.toFixed(3)),
      topEmotion: emotions.top[0]?.label ?? "none",
      topEmotionP: Number((emotions.top[0]?.p ?? 0).toFixed(3)),
      source: mdl ? "trained+lexicon" : "lexicon-only",
    },
  };

  return { reading, emotions, markers };
}
