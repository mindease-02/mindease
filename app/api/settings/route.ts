import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import { forget } from "@/lib/memory";
import { DAY } from "@/lib/util/time";
import { isLanguage } from "@/lib/i18n";
import { serverClient, supabaseConfigured } from "@/lib/supabase";

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
    language?: string;
    displayName?: string;
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
  if (body.language !== undefined && isLanguage(body.language)) state.language = body.language;
  if (typeof body.displayName === "string" && body.displayName.trim()) {
    state.displayName = body.displayName.trim().slice(0, 40);
    if (supabaseConfigured()) { try { const sb = await serverClient(); await sb.auth.updateUser({ data: { name: state.displayName } }); } catch { /* metadata sync is best-effort */ } }
  }
  if (body.setupDone !== undefined) state.setupDone = !!body.setupDone;
  if (body.clearAll) {
    state.history = []; state.messages = []; state.memories = []; state.outreach = []; state.sessions = []; state.currentSessionId = undefined;
  }
  await store.put(state);
  return NextResponse.json({ ok: true });
}
