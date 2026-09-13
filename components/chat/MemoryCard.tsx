"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";

const KIND_KEY: Record<string, string> = { person: "stPeople", event: "stEvents", preference: "stPrefs", past: "stPast", fact: "stFacts", goal: "stGoals", struggle: "stStruggles", routine: "stRoutine" };

/**
 * A memory MindEase just made, shown in the chat where it happened, with
 * the forget button right there. Forgetting is immediate and final.
 */
export default function MemoryCard({ m, lang, onForget }: { m: { id: string; text: string; kind: string }; lang: string; onForget: (id: string) => Promise<void> }) {
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (gone) return null;
  return (
    <div className="memcard" role="note">
      <span className="memcard-kind">{t(KIND_KEY[m.kind] ?? "stFacts", lang)}</span>
      <span className="memcard-text">{m.text}</span>
      <button type="button" className="memcard-x" disabled={busy} onClick={async () => { setBusy(true); try { await onForget(m.id); setGone(true); } finally { setBusy(false); } }}>{t("forget", lang)}</button>
    </div>
  );
}
