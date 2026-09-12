import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import { userView } from "@/lib/pipeline/userView";
import { loadOrCreate } from "@/lib/pipeline/turn";
import { ensureSession, listSessions, sessionMessages } from "@/lib/sessions";

export const runtime = "nodejs";

/** Mirror view + any queued proactive messages. Polled by the client. */
export async function GET(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const url = new URL(req.url);
  const tz = url.searchParams.get("tz") ?? undefined;
  const store = getStore();
  const state = migrate(await loadOrCreate(session.userId, session.name, tz));
  const outbox = await store.drainOutbox(session.userId);
  const mirror = url.searchParams.get("mirror") === "1" ? userView(state) : null;
  const arrival = state.arrival && Date.now() - state.arrival.at < 6 * 3600_000 ? state.arrival : null;
  const before = state.currentSessionId;
  ensureSession(state);
  if (state.currentSessionId !== before) await store.put(state);
  return NextResponse.json({
    name: state.displayName, email: session.identifier, language: state.language ?? "auto", outbox, mirror, arrival,
    messages: state.consent.storeTranscript ? sessionMessages(state).slice(-80) : [],
    sessions: listSessions(state), currentSessionId: state.currentSessionId ?? null,
  });
}
