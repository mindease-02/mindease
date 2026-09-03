import { NextResponse } from "next/server";
import { SESSION_COOKIE, cookieOptions, signSession, userIdFor } from "@/lib/auth";
import { loadOrCreate } from "@/lib/pipeline/turn";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { identifier?: string; name?: string; timeZone?: string; region?: string; proactive?: boolean };
  const identifier = (body.identifier ?? body.name ?? "").trim();
  if (identifier.length < 1 || identifier.length > 120) {
    return NextResponse.json({ error: "Tell me what to call you." }, { status: 400 });
  }
  const name = (body.name ?? identifier.split("@")[0]).trim().slice(0, 40) || "you";
  const userId = userIdFor(identifier);
  const state = await loadOrCreate(userId, name, body.timeZone, body.region);
  if (typeof body.proactive === "boolean" && state.consent.enabled !== body.proactive) {
    state.consent.enabled = body.proactive;
    await getStore().put(state);
  }
  const res = NextResponse.json({ ok: true, name, userId, returning: state.history.length > 0 });
  res.cookies.set(SESSION_COOKIE, signSession({ userId, name, identifier, createdAt: Date.now() }), cookieOptions());
  return res;
}
