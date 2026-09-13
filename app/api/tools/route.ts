import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";

export const runtime = "nodejs";

const KINDS = new Set(["box", "sigh", "ground", "move"]);

/** Records that a coping tool was actually started. Counts tools, never conversations. */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { kind?: string };
  if (!b.kind || !KINDS.has(b.kind)) return NextResponse.json({ error: "unknown tool" }, { status: 400 });
  const store = getStore();
  const raw = await store.get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  const now = Date.now();
  state.tools ??= [];
  // One entry per tool per ten minutes: a restarted breathing round is not a new use.
  const last = [...state.tools].reverse().find((x) => x.kind === b.kind);
  if (!last || now - last.at > 10 * 60_000) state.tools = [...state.tools, { kind: b.kind, at: now }].slice(-300);
  await store.put(state);
  return NextResponse.json({ ok: true, count: state.tools.filter((x) => x.kind === b.kind).length });
}
