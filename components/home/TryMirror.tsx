"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { tx } from "@/lib/i18n/tx";
import { PxArrow } from "./pixelIcons";

interface Read { states: { name: string; intensity: number }[]; need: string | null; why: string | null; intensity: number; masking?: number; maskingNote?: string | null }

const pct = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 100);

/**
 * The landing page's live read: one line in, the Mirror's caption out. It calls
 * the same analyser the chat uses, stores nothing, and is rate-limited. Three
 * suggested lines sit under the box. The read is shown as it really is: the
 * states it saw, each as a bar the length of its intensity, what it thinks you
 * need, and how strongly it reads overall. A reading, never a diagnosis.
 */
export default function TryMirror({ lang, embedded = false }: { lang: string; embedded?: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [read, setRead] = useState<Read | null>(null);
  const [readId, setReadId] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const quick = [1, 2, 3].map((i) => t(`tryQ${i}s`, lang));

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) { setErr(t("tryEmpty", lang)); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/try", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: lang }) });
      if (r.status === 429) { setErr(t("tryLimit", lang)); return; }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "error");
      setRead(j); setReadId((n) => n + 1);
    } catch { setErr(tx("dtTryFail", lang, "Couldn't read that just now. Try again in a moment.")); }
    finally { setBusy(false); }
  }

  const states = read?.states.slice(0, 3) ?? [];
  const box = (
    <div className="try-box">
      <form onSubmit={go} className="try-form">
        <label htmlFor="try-line" className="sr-only">{t("tryTitle", lang)}</label>
        <textarea id="try-line" className="field try-area" rows={3} value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} placeholder={t("tryPh", lang)} autoComplete="off" />
        <div className="try-quick">
          {quick.map((q) => <button key={q} type="button" className="try-pill" onClick={() => setText(q)}>{q}</button>)}
        </div>
        <button className={`btn btn-primary ${busy ? "soft-pulse" : ""}`} type="submit" disabled={busy || text.trim().length < 3}>{busy ? t("tryReading", lang) : t("tryBtn", lang)} <PxArrow className="pxicon" /></button>
      </form>
      {err && <p className="try-err" role="alert">{err}</p>}
      {/* The live region is always present, so a new read is announced rather than just appearing. */}
      <div className="try-live" aria-live="polite">
        {read && (
          // Keyed by read, so the bars grow in again on every new line.
          <div className="try-read" key={readId}>
            {states.length > 0 && (
              <div className="try-cap try-states-cap"><b>{t("tryStates", lang)}</b></div>
            )}
            {states.length > 0 && (
              <ul className="try-states">
                {states.map((s, i) => (
                  <li key={s.name} className="try-state" style={{ ["--i" as string]: i }}>
                    <span className="try-state-name">{s.name} <span className="sr-only">{pct(s.intensity)}%</span></span>
                    <span className="try-track try-track-state" aria-hidden><i style={{ width: `${Math.max(4, pct(s.intensity))}%` }} /></span>
                  </li>
                ))}
              </ul>
            )}
            {read.need && <div className="try-cap"><b>{t("tryNeed", lang)}</b><span>{read.need}</span></div>}
            <div className="try-cap try-strength" style={{ ["--i" as string]: states.length }}><b>{t("tryStrength", lang)}</b>
              <span className="try-track" role="img" aria-label={`${t("tryStrength", lang)} ${pct(read.intensity)}%`}><i style={{ width: `${Math.max(4, pct(read.intensity))}%` }} /></span>
            </div>
            {read.why && <p className="try-why">{read.why}</p>}
            {(read.masking ?? 0) > 0.5 && read.maskingNote && <p className="try-why">{read.maskingNote}</p>}
            <p className="try-foot">{tx("dtTryNote", lang, "That is what the analyser returned for this one line: a reading, not a diagnosis.")}</p>
          </div>
        )}
      </div>
    </div>
  );
  if (embedded) {
    return (
      <div className="try-embed">
        <div className="try-embed-copy"><p className="try-sub">{t("trySub", lang)}</p></div>
        {box}
      </div>
    );
  }
  return (
    <section id="try" className="block try-block" aria-labelledby="try-title">
      <div className="container try-grid">
        <div>
          <h2 id="try-title" className="display">{t("tryTitle", lang)}</h2>
          <p className="try-sub">{t("trySub", lang)}</p>
        </div>
        {box}
      </div>
    </section>
  );
}
