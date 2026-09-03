import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import { penalizeArm } from "@/lib/proactive/bandit";
import type { ReachKind } from "@/lib/proactive/policy";

export const runtime = "nodejs";

/** "This check-in wasn't useful." A hard negative for the bandit and the budget. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { at?: number; kind?: string };
  const store = getStore();
  const raw = await store.get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  const rec = state.outreach.find((o) => body.at && Math.abs(o.at - body.at) < 5000) ?? state.outreach[state.outreach.length - 1];
  if (rec) { rec.rejected = true; state.bandit = penalizeArm(state.bandit, rec.kind as ReachKind); }
  await store.put(state);
  return NextResponse.json({ ok: true });
}
