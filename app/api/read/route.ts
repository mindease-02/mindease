import { NextResponse } from "next/server";
import { withState } from "@/lib/api/withState";
import { isAxis } from "@/lib/reading/corrections";

export const runtime = "nodejs";

/** "Actually, I'm not sad, I'm frustrated." Stored as a correction; the next reply owns up to it. */
export async function POST(req: Request) {
  return withState<{ messageAt?: number; said?: string; meant?: string }>(req, (state, b) => {
    if (!isAxis(b.said) || !isAxis(b.meant) || b.said === b.meant) return NextResponse.json({ error: "pick what it was instead" }, { status: 400 });
    state.readCorrections = [...(state.readCorrections ?? []), { at: Date.now(), messageAt: Number(b.messageAt) || Date.now(), said: b.said, meant: b.meant }].slice(-100);
    return { ok: true };
  });
}
