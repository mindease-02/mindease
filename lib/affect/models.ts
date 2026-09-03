/**
 * Optional trained heads. If models/emotion.model.json or models/vad.model.json
 * exist (produced by the training pipeline), they are used; otherwise the
 * lexicon fallback in textAffect.ts carries the text channel and the LLM
 * analysis carries the nuance. Loaded once per process.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { SparseLinearModel } from "./classifier";
import type { TextModels } from "./textAffect";

let cached: TextModels | null = null;

export function loadTextModels(): TextModels {
  if (cached) return cached;
  const dir = join(process.cwd(), "models");
  const load = (name: string): SparseLinearModel | undefined => {
    const p = join(dir, name);
    if (!existsSync(p)) return undefined;
    try { return JSON.parse(readFileSync(p, "utf8")) as SparseLinearModel; } catch { return undefined; }
  };
  cached = { emotion: load("emotion.model.json"), vad: load("vad.model.json") };
  return cached;
}
