import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import { mirrorView } from "@/lib/pipeline/mirror";
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
  const mirror = url.searchParams.get("mirror") === "1" ? mirrorView(state) : null;
  return NextResponse.json({ name: state.displayName, outbox, mirror, messages: state.consent.storeTranscript ? state.messages.slice(-60) : [] });
}
