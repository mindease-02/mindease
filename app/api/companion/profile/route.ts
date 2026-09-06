import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getCompanionStore } from "@/lib/companion/store";
import { sanitizeSettings } from "@/lib/companion/profile";
import { voiceConfigured } from "@/lib/companion/voice";
import { getStore, migrate } from "@/lib/store";

export const runtime = "nodejs";

/** The signed-in person's companion, or null if they haven't made one. */
export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const profile = await getCompanionStore().getProfile(session.userId);
  return NextResponse.json({ profile, name: session.name, voiceProvider: voiceConfigured() });
}

/** Create or update. Everything is validated server-side; unknown fields are dropped. */
export async function PUT(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad body" }, { status: 400 });
  const store = getCompanionStore();
  const existing = await store.getProfile(session.userId);
  const settings = sanitizeSettings(body, existing ?? undefined);
  const profile = await store.saveProfile(session.userId, settings);
  // Mark companion mode on the shared state so check-ins speak as the companion.
  try {
    const s = getStore();
    const raw = await s.get(session.userId);
    if (raw) { const st = migrate(raw); st.companionMode = { active: true, companionId: profile.id, name: profile.name, since: st.companionMode?.since ?? Date.now() }; await s.put(st); }
  } catch (err) { console.warn("[companion] mode flag:", (err as Error).message); }
  return NextResponse.json({ profile });
}

/** Remove the companion and everything it held. */
export async function DELETE() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  await getCompanionStore().deleteProfile(session.userId);
  try {
    const s = getStore();
    const raw = await s.get(session.userId);
    if (raw?.companionMode) { const st = migrate(raw); st.companionMode = undefined; await s.put(st); }
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true });
}
