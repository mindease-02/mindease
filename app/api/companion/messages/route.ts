import { NextResponse } from "next/server";
import { getCompanionStore } from "@/lib/companion/store";
import { getStore } from "@/lib/store";
import { isResponse, withCompanion } from "../_shared";

export const runtime = "nodejs";

/** Recent companion transcript plus any queued check-ins. */
export async function GET(req: Request) {
  const c = await withCompanion();
  if (isResponse(c)) return c;
  const limit = Math.max(1, Math.min(200, Number(new URL(req.url).searchParams.get("limit")) || 80));
  const messages = c.profile.privacy.storeHistory ? await getCompanionStore().listMessages(c.session.userId, c.profile.id, limit) : [];
  const outbox = await getStore().drainOutbox(c.session.userId);
  return NextResponse.json({
    messages: messages.map((m) => ({ role: m.role, content: m.content, at: m.createdAt, proactive: m.proactive, kind: m.kind })),
    outbox,
  });
}

/** Clear the companion's conversation history. */
export async function DELETE() {
  const c = await withCompanion();
  if (isResponse(c)) return c;
  const n = await getCompanionStore().clearMessages(c.session.userId, c.profile.id);
  return NextResponse.json({ ok: true, removed: n });
}
