"use client";
/**
 * MindEase offering, then running, a validated screener one question at a time.
 * Frequency options are big tap targets; a progress line shows where you are.
 */
import { useState } from "react";
import type { InstrumentId } from "@/lib/screening/instruments";

interface Item { instrument: InstrumentId; name: string; index: number; total: number; stem: string; text: string; options: { label: string; value: number }[] }
export interface ScreeningResult { message: string; score: number; band: string; max: number; crisis: boolean; helplines: unknown; emergency: string }

export default function ScreeningCard({ offer, onDone, onDismiss }: { offer: { instrument: InstrumentId; reason: string; intro: string }; onDone: (r: ScreeningResult) => void; onDismiss: () => void }) {
  const [item, setItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const call = async (body: Record<string, unknown>) => { const r = await fetch("/api/screen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); };
  async function start() { setBusy(true); try { const j = await call({ action: "start", instrument: offer.instrument }); if (j.item) setItem(j.item); } finally { setBusy(false); } }
  async function answer(v: number) { setBusy(true); try { const j = await call({ action: "answer", value: v }); if (j.done) onDone(j); else if (j.item) setItem(j.item); } finally { setBusy(false); } }
  async function decline() { await call({ action: "decline", instrument: offer.instrument }).catch(() => {}); onDismiss(); }

  if (!item) return (
    <div className="offer bubble-ai" role="group" aria-label="MindEase is offering a screening">
      <p className="offer-q">{offer.intro}</p>
      <p className="muted" style={{ fontSize: ".8rem", margin: "0 0 10px" }}>Why now: {offer.reason}. It&apos;s a screening, not a diagnosis, and you can stop at any question.</p>
      <div className="offer-opts">
        <button type="button" className="offer-opt" disabled={busy} onClick={start}><b>Okay, let&apos;s do it</b><span>{offer.instrument.toUpperCase().replace("PHQ9", "PHQ-9").replace("GAD7", "GAD-7")} · two minutes</span></button>
        <button type="button" className="offer-opt dim" disabled={busy} onClick={decline}><b>Not now</b><span>ask me again in a couple of weeks</span></button>
      </div>
    </div>
  );
  return (
    <div className="offer bubble-ai screen" role="group" aria-label={`${item.name} question ${item.index + 1} of ${item.total}`}>
      <div className="screen-prog" aria-hidden>{Array.from({ length: item.total }).map((_, i) => <i key={i} className={i <= item.index ? "on" : ""} />)}</div>
      <p className="muted" style={{ fontSize: ".72rem", margin: "6px 0 2px", letterSpacing: ".1em", textTransform: "uppercase" }}>{item.name} · {item.index + 1} of {item.total}</p>
      <p className="offer-q"><span className="muted">{item.stem}</span> {item.text}</p>
      <div className="offer-opts">
        {item.options.map((o) => <button key={o.value} type="button" className="offer-opt" disabled={busy} onClick={() => answer(o.value)}><b>{o.label}</b></button>)}
      </div>
      <button type="button" className="linkish" style={{ marginTop: 6 }} disabled={busy} onClick={decline}>Stop here</button>
    </div>
  );
}
