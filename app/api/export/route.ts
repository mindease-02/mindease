import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";

export const runtime = "nodejs";

/** Everything held about the signed-in person, as a downloadable JSON file. */
export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const raw = await getStore().get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  const body = {
    exportedAt: new Date().toISOString(),
    note: "MoodPoints are per-message affect estimates and cannot be turned back into text. Memory embeddings are omitted; the memory text is included.",
    ...state,
    memories: state.memories.map(({ embedding: _e, ...m }) => m),
    push: state.push.map((p) => ({ endpoint: p.endpoint.slice(0, 40) + "…", addedAt: p.addedAt })),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mindease-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
