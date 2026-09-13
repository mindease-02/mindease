"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";

export interface Reason {
  states: string[];
  need: string | null;
  intensity: number;
  used: { id: string; text: string; kind: string }[];
  will: { id: string; text: string; kind: string }[];
  raised: boolean;
}

/**
 * The glanceable "why this reply" under a message. Closed by default, one
 * tap to open, and built only from what this turn returned; nothing here is
 * fetched or stored, so it disappears with the page.
 */
export default function ReasonStrip({ r, lang }: { r: Reason; lang: string }) {
  const [open, setOpen] = useState(false);
  const level = r.intensity >= 0.66 ? 3 : r.intensity >= 0.33 ? 2 : 1;
  return (
    <div className="reason">
      <button type="button" className="reason-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? t("rsHide", lang) : t("rsShow", lang)}</button>
      {open && (
        <dl className="reason-body">
          {r.states.length > 0 && <div><dt>{t("rsRead", lang)}</dt><dd>{r.states.join(", ")}</dd></div>}
          {r.need && r.need !== "unclear" && <div><dt>{t("rsNeed", lang)}</dt><dd>{r.need}</dd></div>}
          <div><dt>{t("rsIntensity", lang)}</dt><dd><span className="reason-dots" aria-label={`${level}/3`}>{[1, 2, 3].map((i) => <i key={i} className={i <= level ? "on" : ""} />)}</span></dd></div>
          {r.used.length > 0 && <div><dt>{t("rsUsed", lang)}</dt><dd>{r.used.map((m) => m.text).join("; ")}</dd></div>}
          {r.raised && <div><dt>{t("rsSafety", lang)}</dt><dd /></div>}
        </dl>
      )}
    </div>
  );
}
