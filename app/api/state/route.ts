import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import { userView } from "@/lib/pipeline/userView";
import { loadOrCreate } from "@/lib/pipeline/turn";

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
  return NextResponse.json({ name: state.displayName, outbox, mirror, arrival, messages: state.consent.storeTranscript ? state.messages.slice(-60) : [] });
}
