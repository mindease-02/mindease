import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getStore, migrate } from "@/lib/store";
import { mirrorView } from "@/lib/pipeline/mirror";

export const runtime = "nodejs";

/**
 * Full analytics for one user - detector scores, gate verdicts, reliance,
 * bandit posteriors, safety log, incongruence calibration - plus the raw state.
 * Not shown to the person; used for review and training.
 *   GET /api/admin/user?id=<userId>   Authorization: Bearer $ADMIN_SECRET
 */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const raw = await getStore().get(id);
  if (!raw) return NextResponse.json({ error: "not found" }, { status: 404 });
  const state = migrate(raw);
  return NextResponse.json({ analytics: mirrorView(state), state: { ...state, memories: state.memories.map(({ embedding: _e, ...m }) => m), push: state.push.length } });
}
