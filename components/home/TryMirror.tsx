"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { PxArrow } from "./pixelIcons";

interface Read { states: { name: string; intensity: number }[]; need: string | null; why: string | null; intensity: number; masking?: number; maskingNote?: string | null }

/**
 * The landing page's live read: one line in, the Mirror's caption out. It calls
 * the same analyser the chat uses, stores nothing, and is rate-limited.
 */
export default function TryMirror({ lang }: { lang: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [read, setRead] = useState<Read | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 3) { setErr(t("tryEmpty", lang)); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/try", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: lang }) });
      if (r.status === 429) { setErr(t("tryLimit", lang)); return; }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "error");
      setRead(j);
    } catch { setErr(t("tryEmpty", lang)); }
    finally { setBusy(false); }
  }

  return (
    <section id="try" className="block try-block" aria-labelledby="try-title">
      <div className="container try-grid">
        <div>
          <h2 id="try-title" className="display">{t("tryTitle", lang)}</h2>
          <p className="try-sub">{t("trySub", lang)}</p>
        </div>
        <div className="try-box">
          <form onSubmit={go} className="try-form">
            <label htmlFor="try-line" className="sr-only">{t("tryTitle", lang)}</label>
            <input id="try-line" className="field" value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} placeholder={t("tryPh", lang)} autoComplete="off" />
            <button className="btn btn-primary" type="submit" disabled={busy || text.trim().length < 3}>{busy ? t("tryReading", lang) : t("tryBtn", lang)} <PxArrow className="pxicon" /></button>
          </form>
          {err && <p className="try-err" role="alert">{err}</p>}
          {read && (
            <div className="try-read" aria-live="polite">
              <div className="try-cap"><b>{t("tryStates", lang)}</b>
                <span className="try-chips">{read.states.slice(0, 3).map((s) => <span key={s.name} className="try-chip">{s.name}</span>)}</span>
              </div>
              {read.need && <div className="try-cap"><b>{t("tryNeed", lang)}</b><span>{read.need}</span></div>}
              {read.why && <p className="try-why">{read.why}</p>}
              {(read.masking ?? 0) > 0.5 && read.maskingNote && <p className="try-why">{read.maskingNote}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
