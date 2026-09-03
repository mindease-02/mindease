/**
 * Local embeddings. Groq has no embeddings endpoint and ChromaDB cannot run in
 * a Vercel function, so memory retrieval uses a hashed bag of words + bigrams
 * projected into 256 dimensions with the signed hashing trick, L2-normalised.
 * Cosine similarity over that is a reasonable lexical-semantic retriever for a
 * few hundred short memories per person, which is the scale here. The interface
 * (embed / cosine) is the only thing the rest of the memory code depends on, so
 * a real embedding model can be dropped in without touching retrieval.
 */
import { hashFeature } from "../affect/hash";
import { tokenize } from "../affect/tokenize";

export const EMBED_DIM = 256;

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at", "for", "with", "is", "are",
  "was", "were", "be", "been", "it", "this", "that", "i", "you", "we", "they", "he", "she", "my",
  "me", "your", "so", "just", "like", "have", "has", "had", "do", "did", "not", "very", "really",
]);

export function embed(text: string): number[] {
  const { words } = tokenize(text);
  const content = words.filter((w) => w.length > 1 && !STOP.has(w));
  const vec = new Array<number>(EMBED_DIM).fill(0);
  const add = (tok: string, w: number) => {
    const { idx, sign } = hashFeature(tok, EMBED_DIM);
    vec[idx] += sign * w;
  };
  for (let i = 0; i < content.length; i++) {
    add(content[i], 1);
    // crude stemming so "friends"/"friend" and "walked"/"walk" land together
    const stem = content[i].replace(/(ing|ed|es|s)$/, "");
    if (stem !== content[i] && stem.length > 2) add("~" + stem, 0.7);
    if (i > 0) add(content[i - 1] + "_" + content[i], 0.6);
  }
  let n = 0;
  for (const v of vec) n += v * v;
  n = Math.sqrt(n) || 1;
  return vec.map((v) => v / n);
}

export function cosine(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

/** Keyword overlap (Jaccard on content words), a complementary retrieval signal. */
export function overlap(a: string, b: string): number {
  const A = new Set(tokenize(a).words.filter((w) => !STOP.has(w) && w.length > 2));
  const B = new Set(tokenize(b).words.filter((w) => !STOP.has(w) && w.length > 2));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}
