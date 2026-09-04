/**
 * Long-term memory.
 *
 * A companion without memory is a stranger every morning, and a stranger cannot
 * be part of someone's life story. But memory is also the most sensitive thing
 * this system holds, so the rules are:
 *
 *  - Memories are short, LLM-extracted facts, not transcripts. "Her sister Maya
 *    lives in Leeds; they fell out in March" - not the paragraph it came from.
 *  - Every memory is visible and deletable from the Mirror panel.
 *  - Retrieval is scored on similarity + keyword overlap + a recency/importance
 *    term, so an old but important memory (a bereavement) still surfaces.
 *  - Recall is logged. A memory the companion keeps bringing up is one the user
 *    should be able to see it is fixated on.
 */
import { cosine, embed, overlap } from "./embed";
import { DAY } from "../util/time";

export type MemoryKind = "person" | "event" | "preference" | "past" | "fact" | "goal" | "struggle" | "routine";

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  text: string;
  at: number;
  /** 0..1 - how much this matters, per the extractor. */
  importance: number;
  embedding: number[];
  recallCount: number;
  lastRecalledAt: number;
  /** Where in the person's timeline this belongs, when it is about the past. */
  era?: string;
}

export interface RetrievedMemory {
  item: MemoryItem;
  score: number;
}

export function newMemory(kind: MemoryKind, text: string, importance: number, at = Date.now(), era?: string): MemoryItem {
  return {
    id: Math.random().toString(36).slice(2, 10) + at.toString(36),
    kind, text: text.trim(), at,
    importance: Math.max(0, Math.min(1, importance)),
    embedding: embed(text), recallCount: 0, lastRecalledAt: 0, era,
  };
}

/** Add without duplicating; a near-identical existing memory is refreshed instead. */
export function addMemories(existing: MemoryItem[], incoming: MemoryItem[], limit = 400): MemoryItem[] {
  const out = [...existing];
  for (const m of incoming) {
    const dup = out.findIndex((e) => cosine(e.embedding, m.embedding) > 0.88 || overlap(e.text, m.text) > 0.75);
    if (dup >= 0) {
      out[dup] = { ...out[dup], text: m.text.length > out[dup].text.length ? m.text : out[dup].text,
        importance: Math.max(out[dup].importance, m.importance), at: Math.max(out[dup].at, m.at), embedding: m.embedding };
    } else {
      out.push(m);
    }
  }
  if (out.length > limit) {
    // Drop the least important, least recalled, oldest first.
    out.sort((a, b) => (b.importance + b.recallCount * 0.05 + b.at / 1e14) - (a.importance + a.recallCount * 0.05 + a.at / 1e14));
    out.length = limit;
  }
  return out;
}

export function retrieve(memories: MemoryItem[], query: string, k = 6, now = Date.now()): RetrievedMemory[] {
  if (!memories.length || !query.trim()) return [];
  const q = embed(query);
  return memories
    .map((item) => {
      const sim = cosine(q, item.embedding);
      const kw = overlap(query, item.text);
      const ageDays = (now - item.at) / DAY;
      const recency = Math.exp(-ageDays / 60);
      const score = 0.55 * sim + 0.25 * kw + 0.12 * item.importance + 0.08 * recency;
      return { item, score };
    })
    .filter((r) => r.score > 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/** The most important things to always keep in view, regardless of the query. */
export function anchors(memories: MemoryItem[], k = 4): MemoryItem[] {
  return [...memories]
    .filter((m) => m.kind === "person" || m.kind === "struggle" || m.kind === "goal" || m.importance >= 0.7)
    .sort((a, b) => b.importance - a.importance || b.at - a.at)
    .slice(0, k);
}

export function markRecalled(memories: MemoryItem[], ids: string[], now = Date.now()): MemoryItem[] {
  const set = new Set(ids);
  return memories.map((m) => set.has(m.id) ? { ...m, recallCount: m.recallCount + 1, lastRecalledAt: now } : m);
}

export function forget(memories: MemoryItem[], id: string): MemoryItem[] {
  return memories.filter((m) => m.id !== id);
}

export function formatForPrompt(items: MemoryItem[]): string {
  if (!items.length) return "";
  const when = (m: MemoryItem) => {
    const d = (Date.now() - m.at) / DAY;
    return d < 1 ? "today" : d < 2 ? "yesterday" : d < 14 ? `${Math.round(d)}d ago` : new Date(m.at).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  };
  return items.map((m) => `- [${m.kind}${m.era ? ", " + m.era : ""}, noted ${when(m)}] ${m.text}`).join("\n");
}
