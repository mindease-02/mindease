import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";

export const runtime = "nodejs";

/** "This check-in wasn't useful." That style becomes rarer, and the budget gate counts it as not landing. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { at?: number; kind?: string };
  const store = getStore();
  const raw = await store.get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  const rec = state.outreach.find((o) => body.at && Math.abs(o.at - body.at) < 5000) ?? state.outreach[state.outreach.length - 1];
  // A fixed rule reads this: two "not useful" marks on a style in sixty days and it is skipped (lib/proactive/kind.ts).
  if (rec) rec.rejected = true;
  await store.put(state);
  return NextResponse.json({ ok: true });
}
