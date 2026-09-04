import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import { loadOrCreate } from "@/lib/pipeline/turn";
import { MOODS } from "@/lib/moods";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { mood?: string; note?: string; skip?: boolean; noteOnly?: boolean };
  const state = migrate(await loadOrCreate(session.userId, session.name));
  if (body.skip) {
    state.arrival = undefined;
  } else {
    const m = MOODS.find((x) => x.id === body.mood);
    if (!m) return NextResponse.json({ error: "unknown mood" }, { status: 400 });
    const note = (body.note ?? "").trim().slice(0, 200) || undefined;
    state.arrival = body.noteOnly
      ? { mood: "custom", label: "In their own words", hint: "no tile chosen", note, at: Date.now() }
      : { mood: m.id, label: m.label, hint: m.hint, note, at: Date.now() };
  }
  await getStore().put(state);
  return NextResponse.json({ ok: true, arrival: state.arrival ?? null, needsSetup: !state.setupDone });
}
