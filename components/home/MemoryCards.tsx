"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";

/**
 * The memory promise, as a thing you can do: four example memories, each with
 * a Forget button that really removes it (from this demo; nothing here was
 * ever stored). The kinds match what the chat keeps: people, past, goals,
 * routines.
 */
const CARDS: [string, string, string][] = [["f2c3k", "f2c3", "🎯"], ["f2c4k", "f2c4", "📅"], ["f2c1k", "f2c1", "👤"], ["f2c2k", "f2c2", "📖"]];

export default function MemoryCards({ lang }: { lang: string }) {
  const [gone, setGone] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string | null>(null);
  const forget = (id: string) => { setLeaving(id); setTimeout(() => { setGone((g) => [...g, id]); setLeaving(null); }, 380); };
  const left = CARDS.filter(([, v]) => !gone.includes(v));
  return (
    <div className="mem-cards" aria-live="polite">
      {left.map(([k, v, icon]) => (
        <div key={v} className={`mem-card glass-card ${leaving === v ? "bye" : ""}`}>
          <span className="mem-kind"><span aria-hidden>{icon}</span> {t(k, lang)}</span>
          <p>{t(v, lang)}</p>
          <button type="button" className="mem-forget" onClick={() => forget(v)} aria-label={`${t("forget", lang)}: ${t(v, lang)}`}>{t("forget", lang)}</button>
        </div>
      ))}
      {left.length === 0 && (
        <p className="mem-note">{t("memDemoNote", lang)} <button type="button" className="linkish" onClick={() => setGone([])}>{t("memDemoReset", lang)}</button></p>
      )}
    </div>
  );
}
