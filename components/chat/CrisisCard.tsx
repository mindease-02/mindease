"use client";
import { useState } from "react";
import { SITUATIONS, openNow, sortOpenFirst, type Helpline } from "@/lib/safety/resources";
import { t } from "@/lib/i18n";
import NearbyHelp from "./NearbyHelp";

const digits = (contact: string) => (contact.match(/\+?\d[\d\s-]{1,16}\d/)?.[0] ?? "").replace(/[^\d+]/g, "");
/** 8 -> "8am", 12.5 -> "12:30pm", 21 -> "9pm". */
const clock = (h: number) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); const ampm = hh >= 12 ? "pm" : "am"; const h12 = hh % 12 === 0 ? 12 : hh % 12; return `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""}${ampm}`; };

function Status({ hours, lang }: { hours: Helpline["hours"]; lang: string }) {
  if (!hours) return null;
  const s = openNow(hours);
  return <em className={`crisis-status ${s.open ? "open" : "closed"}`}>{s.open ? t("nearOpen", lang) : t("lineClosed", lang, { at: clock(s.opensAt!) })}</em>;
}

/**
 * Crisis help. Rendered from hard-coded, verified data only; the model never
 * supplies a number. "confirm" asks first (implicit signals); "show" and
 * "open" (the Help button) put everything on screen at once.
 */
export default function CrisisCard({ helplines, emergency, lang = "en", mode = "show", onClose, headingLevel = 3 }: { helplines: Helpline[]; emergency: string; lang?: string; mode?: "show" | "confirm" | "open"; onClose?: () => void; headingLevel?: 2 | 3 }) {
  const [asked, setAsked] = useState(mode !== "confirm");
  const [situations, setSituations] = useState(false);
  const local = helplines.filter((h) => h.region !== "*");
  const ordered = sortOpenFirst(helplines);
  const specific = sortOpenFirst(SITUATIONS.filter((s) => local.some((h) => h.region === s.region)));

  if (!asked) {
    return (
      <div className="crisis crisis-ask" role="region" aria-label={t("crisisAskTitle", lang)}>
        <p>{t("crisisAsk", lang)}</p>
        <div className="crisis-row">
          <button type="button" className="crisis-btn" onClick={() => setAsked(true)}>{t("crisisAskYes", lang)}</button>
          <button type="button" className="crisis-link" onClick={onClose}>{t("crisisAskNo", lang)}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="crisis" role="region" aria-label={t("crisisEyebrow", lang)}>
      <div className="crisis-head">
        {headingLevel === 2 ? <h2>{t("crisisEyebrow", lang)}</h2> : <h3>{t("crisisEyebrow", lang)}</h3>}
        {mode === "open" && onClose && <button type="button" className="crisis-link" onClick={onClose}>{t("close", lang)}</button>}
      </div>
      <p className="crisis-p">{t("crisisP", lang, { emergency })}</p>
      <ul className="crisis-lines">
        {ordered.map((h) => {
          const num = digits(h.contact);
          return (
            <li key={h.name}>
              <div><b>{h.name}</b>{h.note && <span>{h.note}</span>}<Status hours={h.hours} lang={lang} /></div>
              {num ? <a className="crisis-call" href={`tel:${num}`}>{h.contact}</a> : h.url ? <a className="crisis-call" href={h.url} target="_blank" rel="noreferrer">{h.contact}</a> : <span>{h.contact}</span>}
            </li>
          );
        })}
        <li className="crisis-emergency"><div><b>{t("crisisEmergency", lang)}</b></div><a className="crisis-call" href={`tel:${emergency}`}>{emergency}</a></li>
      </ul>
      <NearbyHelp lang={lang} />
      {specific.length > 0 && (
        <div className="crisis-situations">
          <button type="button" className="crisis-link" aria-expanded={situations} onClick={() => setSituations((v) => !v)}>{t("crisisSituations", lang)}</button>
          {situations && (
            <ul className="crisis-lines">
              {specific.map((s) => (
                <li key={s.name}>
                  <div><b>{t(s.situationKey, lang)}</b><span>{s.name}{s.note ? `, ${s.note}` : ""}</span><Status hours={s.hours} lang={lang} /></div>
                  <a className="crisis-call" href={s.href}>{s.contact}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="crisis-small">{t("crisisFoot", lang)}</p>
    </div>
  );
}
