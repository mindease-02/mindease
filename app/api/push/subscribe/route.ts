import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as null | { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys.auth) return NextResponse.json({ error: "bad subscription" }, { status: 400 });
  const store = getStore();
  const raw = await store.get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  state.push = [...state.push.filter((p) => p.endpoint !== body.endpoint), { endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth }, addedAt: Date.now() }].slice(-5);
  state.consent.pushNotifications = true;
  await store.put(state);
  return NextResponse.json({ ok: true, devices: state.push.length });
}

export async function DELETE(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  const store = getStore();
  const raw = await store.get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  state.push = body.endpoint ? state.push.filter((p) => p.endpoint !== body.endpoint) : [];
  if (!state.push.length) state.consent.pushNotifications = false;
  await store.put(state);
  return NextResponse.json({ ok: true, devices: state.push.length });
}
