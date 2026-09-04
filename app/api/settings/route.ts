import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import { forget } from "@/lib/memory";
import { DAY } from "@/lib/util/time";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const store = getStore();
  const raw = await store.get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  const body = (await req.json().catch(() => ({}))) as {
    consent?: Partial<typeof state.consent> & { cadence?: Partial<typeof state.consent.cadence> };
    setupDone?: boolean;
    forgetMemoryId?: string;
    pauseDays?: number | null;
    clearAll?: boolean;
    region?: string;
  };

  if (body.consent) {
    const { cadence, ...rest } = body.consent;
    state.consent = { ...state.consent, ...rest, cadence: { ...state.consent.cadence, ...(cadence ?? {}) } };
    state.consent.dailyMax = Math.max(0, Math.min(6, Number(state.consent.dailyMax) || 0));
    state.consent.weeklyBudget = Math.max(0, Math.min(21, Number(state.consent.weeklyBudget) || 0));
    if (!state.consent.storeTranscript) state.messages = [];
  }
  if (body.forgetMemoryId) state.memories = forget(state.memories, body.forgetMemoryId);
  if (body.pauseDays !== undefined) state.pausedUntil = body.pauseDays ? Date.now() + body.pauseDays * DAY : undefined;
  if (body.region) state.region = body.region.toUpperCase().slice(0, 2);
  if (body.setupDone !== undefined) state.setupDone = !!body.setupDone;
  if (body.clearAll) {
    state.history = []; state.messages = []; state.memories = []; state.outreach = [];
  }
  await store.put(state);
  return NextResponse.json({ ok: true });
}
