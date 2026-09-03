import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { evaluateUser } from "@/lib/pipeline/checkin";
import { REACH_KINDS, type ReachKind } from "@/lib/proactive/policy";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The client's own scheduler calls this while the app is open, so proactive
 * check-ins work even without a KV store or cron. `force` previews a given kind
 * without touching the budget or the bandit.
 */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { force?: string };
  const force = body.force && REACH_KINDS.includes(body.force as ReachKind) ? (body.force as ReachKind) : null;
  const r = await evaluateUser(session.userId, { force });
  if (!r) return NextResponse.json({ error: "no state" }, { status: 404 });
  return NextResponse.json({ sent: !!r.message, kind: r.decision.kind, blockedBy: r.decision.blockedBy, gates: r.decision.gates });
}
