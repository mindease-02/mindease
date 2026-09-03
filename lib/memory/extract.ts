/**
 * Memory extraction. After a user turn, the fast model pulls out at most three
 * durable facts worth remembering. The bar is "would a good friend remember
 * this next week" - not "was this mentioned".
 */
import { complete, llmConfig, parseJsonObject } from "../llm";
import { newMemory, type MemoryItem, type MemoryKind } from "./index";

const KINDS: MemoryKind[] = ["person", "event", "preference", "past", "fact", "goal", "struggle"];

const SYSTEM = `You extract durable memories for a companion app from ONE message a person wrote. Return JSON: {"memories":[{"kind":..., "text":..., "importance":0-1, "era":string|null}]}.

Rules:
- At most 3. Often 0. Only things worth remembering in a week: named people and the relationship, events with a time, preferences, ongoing struggles, goals, and stories from their past (kind "past", with "era" like "childhood", "university", "last year" when stated).
- Write each as one plain third-person sentence about the person ("Their brother Sam calls every Sunday").
- Never store passing moods ("feels tired today") - those are tracked elsewhere. Never store anything about self-harm methods.
- importance: 0.9 for bereavements, diagnoses, relationships, big life changes; 0.5 for routines and preferences; 0.3 for small details.`;

export async function extractMemories(text: string, at = Date.now()): Promise<MemoryItem[]> {
  if (!llmConfig() || text.trim().split(/\s+/).length < 5) return [];
  try {
    const raw = await complete(
      [{ role: "system", content: SYSTEM }, { role: "user", content: text }],
      { tier: "fast", json: true, temperature: 0.1, maxTokens: 300 },
    );
    const j = parseJsonObject<{ memories?: { kind?: string; text?: string; importance?: number; era?: string | null }[] }>(raw);
    if (!j?.memories) return [];
    return j.memories
      .filter((m) => m && typeof m.text === "string" && m.text.trim().length > 6)
      .slice(0, 3)
      .map((m) => newMemory(
        KINDS.includes(m.kind as MemoryKind) ? (m.kind as MemoryKind) : "fact",
        m.text!,
        Number.isFinite(Number(m.importance)) ? Number(m.importance) : 0.4,
        at,
        m.era ? String(m.era) : undefined,
      ));
  } catch (err) {
    console.warn("[memory] extraction failed:", (err as Error).message);
    return [];
  }
}
