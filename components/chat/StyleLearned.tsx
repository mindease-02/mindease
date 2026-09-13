"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";

/**
 * The person's own ratings and corrections: how many there are, what happens to them,
 * and a way to clear them. They do not change how MindEase talks to this person on
 * their own; they are counted, without any words, for people who review MindEase.
 */
export default function StyleLearned({ corrections, feedback, lang, onReset }: { corrections: number; feedback: number; lang: string; onReset: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="style-learned">
      <p className="text-xs text-clay-muted">{t("styRatings", lang)}: {feedback}. {t("styCorrections", lang)}: {corrections}.</p>
      {(feedback > 0 || corrections > 0) && <button type="button" className="clay-btn mt-2 px-3 py-1.5 text-xs" disabled={busy} onClick={async () => { setBusy(true); try { await onReset(); } finally { setBusy(false); } }}>{t("styReset", lang)}</button>}
    </div>
  );
}
