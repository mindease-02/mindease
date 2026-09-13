import { NextResponse } from "next/server";
import { withState } from "@/lib/api/withState";
import { addMemories, forget, newMemory, type MemoryKind } from "@/lib/memory";
import { MEMORY_LIMIT } from "@/lib/store/types";

export const runtime = "nodejs";

const KINDS: MemoryKind[] = ["person", "event", "preference", "past", "fact", "goal", "struggle", "routine"];

/**
 * The person's control over memory: keep a proposed memory, edit one, forget one.
 * Forgetting removes the item and its embedding outright; there is no soft delete.
 */
export async function POST(req: Request) {
  return withState<{ action?: string; id?: string; kind?: string; text?: string; importance?: number; era?: string }>(req, (state, b) => {
    const text = (b.text ?? "").trim().slice(0, 240);
    if (b.action === "keep") {
      if (text.length < 3 || !KINDS.includes(b.kind as MemoryKind)) return NextResponse.json({ error: "nothing to keep" }, { status: 400 });
      const m = newMemory(b.kind as MemoryKind, text, typeof b.importance === "number" ? b.importance : 0.5, Date.now(), b.era?.slice(0, 40));
      state.memories = addMemories(state.memories, [m], MEMORY_LIMIT);
      const kept = state.memories.find((x) => x.id === m.id) ?? state.memories[state.memories.length - 1];
      return { ok: true, memory: { id: kept.id, text: kept.text, kind: kept.kind } };
    }
    if (b.action === "edit") {
      const item = state.memories.find((x) => x.id === b.id);
      if (!item || text.length < 3) return NextResponse.json({ error: "nothing to edit" }, { status: 400 });
      const fresh = newMemory(item.kind, text, item.importance, item.at, item.era);
      Object.assign(item, { text: fresh.text, embedding: fresh.embedding });
      return { ok: true, memory: { id: item.id, text: item.text, kind: item.kind } };
    }
    if (b.action === "forget" && b.id) {
      state.memories = forget(state.memories, b.id);
      return { ok: true };
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  });
}
