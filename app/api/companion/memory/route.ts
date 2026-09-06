import { NextResponse } from "next/server";
import { getCompanionStore } from "@/lib/companion/store";
import { isResponse, withCompanion } from "../_shared";

export const runtime = "nodejs";

/** "What your companion remembers." */
export async function GET() {
  const c = await withCompanion();
  if (isResponse(c)) return c;
  const memories = await getCompanionStore().listMemories(c.session.userId, c.profile.id);
  return NextResponse.json({ memories: memories.map((m) => ({ id: m.id, memory: m.memory, kind: m.kind, createdAt: m.createdAt })) });
}

/** ?id=<memory id> forgets one; ?all=1 forgets everything. Deleted memories are gone from the next turn on. */
export async function DELETE(req: Request) {
  const c = await withCompanion();
  if (isResponse(c)) return c;
  const url = new URL(req.url);
  const store = getCompanionStore();
  if (url.searchParams.get("all") === "1") {
    const n = await store.clearMemories(c.session.userId, c.profile.id);
    return NextResponse.json({ ok: true, removed: n });
  }
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id or all=1 required" }, { status: 400 });
  const ok = await store.deleteMemory(c.session.userId, id);
  return NextResponse.json({ ok, removed: ok ? 1 : 0 });
}
