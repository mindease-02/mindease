"use client";
/**
 * MindEase offering, then running, a validated screener one question at a time.
 * Frequency options are big tap targets; a progress line shows where you are.
 * The items themselves stay in the instrument's validated English wording.
 * Rendered as a bottom sheet above the composer; Escape declines / stops here.
 */
import { useEffect, useRef, useState } from "react";
import type { InstrumentId } from "@/lib/screening/instruments";
import { t } from "@/lib/i18n";

interface Item { instrument: InstrumentId; name: string; index: number; total: number; stem: string; text: string; options: { label: string; value: number }[] }
export interface ScreeningResult { message: string; score: number; band: string; max: number; crisis: boolean; helplines: unknown; emergency: string }

export default function ScreeningCard({ offer, onDone, onDismiss, lang = "en" }: { offer: { instrument: InstrumentId; reason: string; intro: string }; onDone: (r: ScreeningResult) => void; onDismiss: () => void; lang?: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const call = async (body: Record<string, unknown>) => { const r = await fetch("/api/screen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return r.json(); };
  async function start() { setBusy(true); try { const j = await call({ action: "start", instrument: offer.instrument }); if (j.item) setItem(j.item); } finally { setBusy(false); } }
  async function answer(v: number) { setBusy(true); try { const j = await call({ action: "answer", value: v }); if (j.done) onDone(j); else if (j.item) setItem(j.item); } finally { setBusy(false); } }
  async function decline() { await call({ action: "decline", instrument: offer.instrument }).catch(() => {}); onDismiss(); }
  const code = offer.instrument.toUpperCase().replace("PHQ9", "PHQ-9").replace("GAD7", "GAD-7");
  // Each question is a fresh card, and a pressed option goes disabled while the call runs (which drops focus):
  // keep focus on the card so the sheet's Tab loop and Escape keep working.
  useEffect(() => { if (item || busy) root.current?.focus(); }, [item, busy]);
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Escape" && !busy) { e.preventDefault(); decline(); } };

  if (!item) return (
    <div ref={root} className="offer" role="group" aria-label={t("screenAria", lang)} tabIndex={-1} onKeyDown={onKey}>
      <p className="offer-q">{offer.intro}</p>
      <p className="muted" style={{ fontSize: ".8rem", margin: "0 0 10px" }}>{t("screenWhyNow", lang, { reason: offer.reason })}</p>
      <div className="offer-opts">
        <button type="button" className="offer-opt" disabled={busy} onClick={start}><b>{t("okLetsDo", lang)}</b><span>{code}, {t("twoMinutes", lang)}</span></button>
        <button type="button" className="offer-opt dim" disabled={busy} onClick={decline}><b>{t("notNow", lang)}</b><span>{t("askLater", lang)}</span></button>
      </div>
    </div>
  );
  return (
    <div ref={root} className="offer screen" role="group" aria-label={`${item.name} ${t("ofN", lang, { i: String(item.index + 1), n: String(item.total) })}`} tabIndex={-1} onKeyDown={onKey}>
      <div className="screen-prog" aria-hidden>{Array.from({ length: item.total }).map((_, i) => <i key={i} className={i <= item.index ? "on" : ""} />)}</div>
      <p className="muted" style={{ fontSize: ".85rem", margin: "6px 0 2px" }}>{item.name}, {t("ofN", lang, { i: String(item.index + 1), n: String(item.total) })}</p>
      <p className="offer-q"><span className="muted">{item.stem}</span> {item.text}</p>
      <div className="offer-opts">
        {item.options.map((o) => <button key={o.value} type="button" className="offer-opt" disabled={busy} onClick={() => answer(o.value)}><b>{o.label}</b></button>)}
      </div>
      <button type="button" className="linkish" style={{ marginTop: 6 }} disabled={busy} onClick={decline}>{t("stopHere", lang)}</button>
    </div>
  );
}
