/**
 * Inference for the models produced by training/. Zero dependencies, pure
 * arithmetic - it runs inside a serverless function or the browser with no ML
 * runtime, which is the whole reason the training pipeline exports hashed linear
 * models rather than a transformer checkpoint.
 *
 * Two heads:
 *   emotion.model.json - one-vs-rest logistic over GoEmotions' 28 labels,
 *                        Platt-calibrated per label (multi-label, not a simplex).
 *   vad.model.json     - ridge regression onto valence/arousal/dominance,
 *                        trained on EmoBank + the NRC-VAD lexicon projection.
 *
 * Both are sparse int8-quantised: we keep the top-K weights per output and drop
 * the rest. Pruning a hashed linear model this hard costs about 1-2 macro-F1
 * points and buys a model that ships as a JSON file in the repo.
 */
import { hashFeature } from "./hash";
import { tokenize } from "./tokenize";
import { EMOTION_LABELS, type EmotionDistribution, type EmotionLabel, type VAD } from "./types";

export interface SparseLinearModel {
  version: string;
  dim: number;
  outputs: string[];
  /** per-output dequantisation scale: w_real = w_int8 * scale[o] */
  scale: number[];
  intercept: number[];
  /** per-output pruned feature indices, ascending */
  idx: number[][];
  /** per-output int8 weights, parallel to idx */
  w: number[][];
  /** Platt scaling per output: p = sigmoid(a * z + b). Absent for regression heads. */
  calibration?: { a: number[]; b: number[] };
  /** L2 norm the training pipeline normalised feature vectors to. */
  normalize: "l2" | "none";
  meta?: Record<string, unknown>;
}

/** Sparse feature vector: index -> value. */
export type FeatureVec = Map<number, number>;

export function featurize(text: string, dim: number, normalizeVec: boolean): FeatureVec {
  const { features } = tokenize(text);
  const vec: FeatureVec = new Map();
  for (const f of features) {
    const { idx, sign } = hashFeature(f, dim);
    vec.set(idx, (vec.get(idx) ?? 0) + sign);
  }
  if (normalizeVec) {
    let n = 0;
    for (const v of vec.values()) n += v * v;
    n = Math.sqrt(n);
    if (n > 0) for (const [k, v] of vec) vec.set(k, v / n);
  }
  return vec;
}

/** Dot product of a sparse input against one pruned output row. Both sorted-agnostic. */
function dotRow(vec: FeatureVec, idx: number[], w: number[], scale: number): number {
  let acc = 0;
  // Iterate the *model* row when the input is longer, and vice versa - keeps this
  // O(min(|x|, |row|)) instead of always paying for the (much longer) model row.
  if (idx.length < vec.size) {
    for (let i = 0; i < idx.length; i++) {
      const v = vec.get(idx[i]);
      if (v !== undefined) acc += v * w[i];
    }
    return acc * scale;
  }
  const pos = new Map<number, number>();
  for (let i = 0; i < idx.length; i++) pos.set(idx[i], w[i]);
  for (const [k, v] of vec) {
    const wi = pos.get(k);
    if (wi !== undefined) acc += v * wi;
  }
  return acc * scale;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function scoreLinear(model: SparseLinearModel, text: string): number[] {
  const vec = featurize(text, model.dim, model.normalize === "l2");
  const out: number[] = new Array(model.outputs.length);
  for (let o = 0; o < model.outputs.length; o++) {
    out[o] = dotRow(vec, model.idx[o], model.w[o], model.scale[o]) + model.intercept[o];
  }
  return out;
}

export function predictEmotions(model: SparseLinearModel, text: string): EmotionDistribution {
  const z = scoreLinear(model, text);
  const cal = model.calibration;
  const probs: Partial<Record<EmotionLabel, number>> = {};
  const all: { label: EmotionLabel; p: number }[] = [];

  for (let o = 0; o < model.outputs.length; o++) {
    const label = model.outputs[o] as EmotionLabel;
    if (!EMOTION_LABELS.includes(label)) continue;
    const p = cal ? sigmoid(cal.a[o] * z[o] + cal.b[o]) : sigmoid(z[o]);
    probs[label] = p;
    all.push({ label, p });
  }

  all.sort((x, y) => y.p - x.p);
  return { probs, top: all.slice(0, 5) };
}

export function predictVAD(model: SparseLinearModel, text: string): VAD {
  const z = scoreLinear(model, text);
  const get = (name: string) => {
    const i = model.outputs.indexOf(name);
    return i < 0 ? 0 : Math.max(-1, Math.min(1, z[i]));
  };
  return { valence: get("valence"), arousal: get("arousal"), dominance: get("dominance") };
}
