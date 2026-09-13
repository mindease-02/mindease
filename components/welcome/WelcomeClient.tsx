"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOODS } from "@/lib/moods";
import { moodText, t } from "@/lib/i18n";
import { PxArrow } from "../home/pixelIcons";
import ConsentPanel, { type ConsentView } from "../profile/ConsentPanel";

interface Read { states: { name: string }[]; need: string | null; why: string | null }

/**
 * Onboarding as a moment, not a tour: what this is, a first read the person
 * can correct, and the switches. Every step can be skipped; finishing marks
 * setup done so the page never comes back.
 */
export default function WelcomeClient({ name, lang, consent }: { name: string; lang: string; consent: ConsentView }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [line, setLine] = useState("");
  const [read, setRead] = useState<Read | null>(null);
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<"right" | "wrong" | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [chosen, setChosen] = useState<ConsentView>(consent);

  async function finish(fromSignals = false, to = "/chat") {
    setBusy(true);
    try {
      // Leaving the signals step counts as a choice: whatever the switches show is what MindEase may read from now on.
      const consentPatch = fromSignals ? { consent: { typingSignals: chosen.typingSignals, voiceSignals: chosen.voiceSignals, faceSignals: chosen.faceSignals } } : {};
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setupDone: true, ...consentPatch }) });
      if (line.trim()) await fetch("/api/mood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(picked ? { mood: picked, note: line.trim() } : { mood: "okay", note: line.trim(), noteOnly: true }) });
    } finally { router.push(to); }
  }
  async function tryRead(e: React.FormEvent) {
    e.preventDefault();
    if (line.trim().length < 3) return;
    setBusy(true); setRead(null); setVerdict(null);
    try {
      const r = await fetch("/api/try", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: line, language: lang }) });
      if (r.ok) setRead(await r.json());
    } finally { setBusy(false); }
  }

  return (
    <div className="container welcome" style={{ maxWidth: 640 }}>
      <div className="steps-ind" aria-label={t("wlStep", lang)}>{[0, 1, 2].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}<span>{t("wlStep", lang)}</span></div>

      {step === 0 && (
        <section className="glass welcome-card">
          <p className="welcome-hi">{t("wlHi", lang, { name })}</p>
          <h1 className="display">{t("wl1T", lang)}</h1>
          <ol className="welcome-three">
            <li>{t("wl1a", lang)}</li><li>{t("wl1b", lang)}</li><li>{t("wl1c", lang)}</li>
          </ol>
          <div className="welcome-ctas">
            <button className="btn btn-primary" onClick={() => setStep(1)}>{t("wlNext", lang)} <PxArrow className="pxicon" /></button>
            <button className="linkish" onClick={() => finish()} disabled={busy}>{t("wlSkip", lang)}</button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="glass welcome-card">
          <h1 className="display">{t("wl2T", lang)}</h1>
          <p className="muted">{t("wl2Sub", lang)}</p>
          <form onSubmit={tryRead} className="try-form" style={{ marginTop: 16 }}>
            <label htmlFor="wl-line" className="sr-only">{t("wl2T", lang)}</label>
            <input id="wl-line" className="field" value={line} onChange={(e) => setLine(e.target.value.slice(0, 300))} placeholder={t("tryPh", lang)} autoFocus autoComplete="off" />
            <button className="btn" type="submit" disabled={busy || line.trim().length < 3}>{busy ? t("tryReading", lang) : t("tryBtn", lang)}</button>
          </form>
          {read && (
            <div className="try-read" aria-live="polite">
              {read.states.length > 0 && <div className="try-cap"><b>{t("tryStates", lang)}</b><span className="try-chips">{read.states.slice(0, 3).map((s) => <span key={s.name} className="try-chip">{s.name}</span>)}</span></div>}
              {read.why && <p className="try-why">{read.why}</p>}
              {!verdict && (
                <div className="welcome-ctas" style={{ marginTop: 12 }}>
                  <button className="btn" onClick={() => setVerdict("right")}>{t("wl2Right", lang)}</button>
                  <button className="btn" onClick={() => setVerdict("wrong")}>{t("wl2Wrong", lang)}</button>
                </div>
              )}
              {verdict === "wrong" && !picked && (
                <div style={{ marginTop: 12 }}>
                  <p className="muted" style={{ fontSize: ".9rem" }}>{t("wl2Pick", lang)}</p>
                  <div className="welcome-moods">
                    {MOODS.map((m) => <button key={m.id} type="button" className="btn" style={{ ["--c" as string]: m.c }} onClick={() => setPicked(m.id)}><i className="dot" aria-hidden />{moodText(m.id, lang)?.[0] ?? m.label}</button>)}
                  </div>
                </div>
              )}
              {(verdict === "right" || picked) && <p className="muted" style={{ marginTop: 10, fontSize: ".9rem" }}>{t("wlCorrected", lang)}</p>}
            </div>
          )}
          <div className="welcome-ctas">
            <button className="btn btn-primary" onClick={() => setStep(2)}>{t("wlNext", lang)} <PxArrow className="pxicon" /></button>
            <button className="linkish" onClick={() => setStep(2)}>{t("wlSkip", lang)}</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="glass welcome-card">
          <h1 className="display">{t("wl3T", lang)}</h1>
          <p className="muted">{t("wl3Sub", lang)}</p>
          <div style={{ marginTop: 14 }}><ConsentPanel initial={consent} lang={lang} onChange={setChosen} /></div>
          <div className="welcome-ctas">
            <button className="btn btn-primary" onClick={() => finish(true)} disabled={busy}>{t("wlDone", lang)} <PxArrow className="pxicon" /></button>
          </div>
        </section>
      )}
    </div>
  );
}
