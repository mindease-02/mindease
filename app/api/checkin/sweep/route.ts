import { NextResponse } from "next/server";
import { sweep } from "@/lib/pipeline/checkin";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Vercel Cron target (see vercel.json). Evaluates every active user against the
 * proactivity policy and queues messages for those it decides to reach.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sweep();
  return NextResponse.json({ ok: true, at: new Date().toISOString(), ...result });
}
