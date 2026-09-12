import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import { deleteSession, listSessions, sessionMessages, startSession, switchSession } from "@/lib/sessions";

export const runtime = "nodejs";

/** Recent chats for the signed-in person. */
export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const raw = await getStore().get(session.userId);
  if (!raw) return NextResponse.json({ sessions: [], currentSessionId: null });
  const state = migrate(raw);
  return NextResponse.json({ sessions: listSessions(state), currentSessionId: state.currentSessionId ?? null });
}

/** new | switch | delete | rename. Returns the updated list and the current session's messages. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const store = getStore();
  const raw = await store.get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; title?: string };
  if (b.action === "new") startSession(state);
  else if (b.action === "switch" && b.id) { if (!switchSession(state, b.id)) return NextResponse.json({ error: "no such chat" }, { status: 404 }); }
  else if (b.action === "delete" && b.id) deleteSession(state, b.id);
  else if (b.action === "rename" && b.id) { const s = (state.sessions ?? []).find((x) => x.id === b.id); if (s) s.title = (b.title ?? "").trim().slice(0, 60); }
  else return NextResponse.json({ error: "unknown action" }, { status: 400 });
  await store.put(state);
  return NextResponse.json({
    ok: true, sessions: listSessions(state), currentSessionId: state.currentSessionId ?? null,
    messages: state.consent.storeTranscript ? sessionMessages(state).slice(-80) : [],
  });
}
