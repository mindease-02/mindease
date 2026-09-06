import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getStore, migrate } from "@/lib/store";
import { INSTRUMENTS, type InstrumentId } from "@/lib/screening/instruments";
import { resultMessage, scoreScreening } from "@/lib/screening";
import { assessRisk } from "@/lib/safety/crisis";
import { helplinesFor, emergencyFor } from "@/lib/safety/resources";

export const runtime = "nodejs";

/**
 * Conversational screening, one item at a time.
 *   POST { action: "start", instrument }        → first item
 *   POST { action: "answer", value }             → next item, or the scored result
 *   POST { action: "decline" }                   → closes the offer for the cooldown period
 * The result is written into the transcript as a message from MindEase so the
 * conversation carries it, and PHQ-9 item 9 routes to the crisis protocol.
 */
export async function POST(req: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { action?: string; instrument?: InstrumentId; value?: number };
  const store = getStore();
  const raw = await store.get(session.userId);
  if (!raw) return NextResponse.json({ error: "no state" }, { status: 404 });
  const state = migrate(raw);
  state.screenings ??= [];
  const now = Date.now();
  const open = state.screenings.find((s) => !s.completedAt && !s.declined);

  if (b.action === "start") {
    const inst = b.instrument && INSTRUMENTS[b.instrument];
    if (!inst) return NextResponse.json({ error: "unknown instrument" }, { status: 400 });
    const fresh = open && open.instrument === inst.id ? open : (state.screenings.push({ instrument: inst.id, startedAt: now, answers: [] }), state.screenings[state.screenings.length - 1]);
    await store.put(state);
    return NextResponse.json({ ok: true, item: itemPayload(inst.id, fresh.answers.length) });
  }
  if (b.action === "decline") {
    if (open) open.declined = true; else state.screenings.push({ instrument: (b.instrument ?? "phq9") as InstrumentId, startedAt: now, answers: [], declined: true });
    await store.put(state);
    return NextResponse.json({ ok: true });
  }
  if (b.action === "answer") {
    if (!open) return NextResponse.json({ error: "no screening in progress" }, { status: 400 });
    const inst = INSTRUMENTS[open.instrument];
    const v = Number(b.value);
    if (!inst.options.some((o) => o.value === v)) return NextResponse.json({ error: "bad value" }, { status: 400 });
    open.answers.push(v);
    if (open.answers.length < inst.items.length) { await store.put(state); return NextResponse.json({ ok: true, item: itemPayload(inst.id, open.answers.length) }); }
    const scored = scoreScreening(open);
    Object.assign(open, scored);
    const text = resultMessage(scored, state.region);
    const crisis = inst.crisisItem !== undefined && (scored.answers[inst.crisisItem] ?? 0) > 0;
    if (crisis) { const r = assessRisk("thoughts that I would be better off dead"); state.risk = { tier: r.tier === "none" ? "passive" : r.tier, at: now, peakTier: "passive", peakAt: now } as typeof state.risk; }
    if (state.consent.storeTranscript) state.messages = [...state.messages, { role: "assistant" as const, content: text, at: now, kind: `screening:${inst.id}` }].slice(-120);
    await store.put(state);
    return NextResponse.json({ ok: true, done: true, score: scored.score, band: scored.band, max: inst.max, message: text, crisis, helplines: crisis ? helplinesFor(state.region) : null, emergency: emergencyFor(state.region) });
  }
  return NextResponse.json({ error: "bad action" }, { status: 400 });
}

function itemPayload(id: InstrumentId, index: number) {
  const inst = INSTRUMENTS[id];
  return { instrument: id, name: inst.name, index, total: inst.items.length, stem: inst.stem, text: inst.items[index], options: inst.options };
}
