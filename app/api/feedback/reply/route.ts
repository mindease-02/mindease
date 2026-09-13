import { NextResponse } from "next/server";
import { withState } from "@/lib/api/withState";
import { isMissReason } from "@/lib/style/profile";

export const runtime = "nodejs";

/** "This helped" / "This missed", optionally with why. The only input to the style profile besides corrections. */
export async function POST(req: Request) {
  return withState<{ replyAt?: number; verdict?: string; reason?: string; replyLength?: number }>(req, (state, b) => {
    if (b.verdict !== "helped" && b.verdict !== "missed") return NextResponse.json({ error: "helped or missed" }, { status: 400 });
    const replyAt = Number(b.replyAt) || Date.now();
    const list = (state.replyFeedback ?? []).filter((f) => f.replyAt !== replyAt);
    list.push({ at: Date.now(), replyAt, verdict: b.verdict, reason: isMissReason(b.reason) ? b.reason : undefined, replyLength: Math.min(4000, Number(b.replyLength) || 0) || undefined });
    state.replyFeedback = list.slice(-300);
    return { ok: true };
  });
}
