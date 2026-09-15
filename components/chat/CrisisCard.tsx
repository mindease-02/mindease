"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SITUATIONS, openNow, sortOpenFirst, type Helpline } from "@/lib/safety/resources";
import { t } from "@/lib/i18n";
import { tx } from "@/lib/i18n/tx";
import NearbyHelp from "./NearbyHelp";
import { PxRemove } from "../home/pixelIcons";

const digits = (contact: string) => (contact.match(/\+?\d[\d\s-]{1,16}\d/)?.[0] ?? "").replace(/[^\d+]/g, "");
/** 8 -> "8am", 12.5 -> "12:30pm", 21 -> "9pm". */
const clock = (h: number) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); const ampm = hh >= 12 ? "pm" : "am"; const h12 = hh % 12 === 0 ? 12 : hh % 12; return `${h12}${mm ? ":" + String(mm).padStart(2, "0") : ""}${ampm}`; };
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function Status({ hours, lang }: { hours: Helpline["hours"]; lang: string }) {
  if (!hours) return null;
  const s = openNow(hours);
  return <em className={`crisis-status ${s.open ? "open" : "closed"}`}>{s.open ? t("nearOpen", lang) : t("lineClosed", lang, { at: clock(s.opensAt!) })}</em>;
}

function Line({ h, lang }: { h: Helpline; lang: string }) {
  const num = digits(h.contact);
  return (
    <li>
      <div><b>{h.name}</b>{h.note && <span>{h.note}</span>}<Status hours={h.hours} lang={lang} /></div>
      {num ? <a className="crisis-call" href={`tel:${num}`}>{h.contact}</a> : h.url ? <a className="crisis-call" href={h.url} target="_blank" rel="noreferrer">{h.contact}</a> : <span>{h.contact}</span>}
    </li>
  );
}

/**
 * Crisis help. Rendered from hard-coded, verified data only; the model never
 * supplies a number. "confirm" asks first (implicit signals); "show" puts two
 * lines and the emergency number inline with the rest one tap away; "open"
 * (the Help button) is the full sheet, with focus held inside it.
 */
export default function CrisisCard({ helplines, emergency, lang = "en", mode = "show", onClose, headingLevel = 2 }: { helplines: Helpline[]; emergency: string; lang?: string; mode?: "show" | "confirm" | "open"; onClose?: () => void; headingLevel?: 2 | 3 }) {
  const [asked, setAsked] = useState(mode !== "confirm");
  const [situations, setSituations] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const local = helplines.filter((h) => h.region !== "*");
  const ordered = sortOpenFirst(helplines);
  const specific = sortOpenFirst(SITUATIONS.filter((s) => local.some((h) => h.region === s.region)));
  const full = mode === "open";
  const shown = full ? ordered : ordered.slice(0, 2);
  const rest = full ? [] : ordered.slice(2);

  // The sheet: first focus lands on the first call button. The sheet's own
  // focus() runs after this mount, so wait one frame before taking it.
  useEffect(() => {
    if (!full) return;
    const id = requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(".crisis-call")?.focus());
    return () => cancelAnimationFrame(id);
  }, [full]);
  function trap(e: KeyboardEvent<HTMLDivElement>) {
    if (!full || e.key !== "Tab" || !root.current) return;
    const items = Array.from(root.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1], active = document.activeElement;
    if (e.shiftKey && (active === first || !root.current.contains(active))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (active === last || !root.current.contains(active))) { e.preventDefault(); first.focus(); }
  }

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

  const situationList = specific.length > 0 && (
    <ul className="crisis-lines">
      {specific.map((s) => (
        <li key={s.name}>
          <div><b>{t(s.situationKey, lang)}</b><span>{s.name}{s.note ? `, ${s.note}` : ""}</span><Status hours={s.hours} lang={lang} /></div>
          <a className="crisis-call" href={s.href}>{s.contact}</a>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={root} className={`crisis crisis-${mode}`} role="region" aria-label={t("crisisEyebrow", lang)} onKeyDown={trap}>
      <div className="crisis-head">
        {headingLevel === 2 ? <h2>{t("crisisEyebrow", lang)}</h2> : <h3>{t("crisisEyebrow", lang)}</h3>}
        {full && onClose && <button type="button" className="crisis-close" onClick={onClose} aria-label={t("close", lang)} title={t("close", lang)}><PxRemove className="pxicon" /><span>{t("close", lang)}</span></button>}
      </div>
      <p className="crisis-p">{t("crisisP", lang, { emergency })}</p>
      <ul className="crisis-lines">
        {shown.map((h) => <Line key={h.name} h={h} lang={lang} />)}
        <li className="crisis-emergency"><div><b>{t("crisisEmergency", lang)}</b></div><a className="crisis-call" href={`tel:${emergency}`}>{emergency}</a></li>
      </ul>
      {full ? (
        <>
          <NearbyHelp lang={lang} />
          {specific.length > 0 && (
            <div className="crisis-situations">
              <button type="button" className="crisis-link" aria-expanded={situations} onClick={() => setSituations((v) => !v)}>{t("crisisSituations", lang)}</button>
              {situations && situationList}
            </div>
          )}
        </>
      ) : (rest.length > 0 || specific.length > 0) && (
        <details className="crisis-more">
          <summary>{tx("crisisMore", lang, "More lines")}</summary>
          <div className="crisis-more-body">
            {rest.length > 0 && <ul className="crisis-lines">{rest.map((h) => <Line key={h.name} h={h} lang={lang} />)}</ul>}
            {specific.length > 0 && <><p className="crisis-small crisis-sub">{t("crisisSituations", lang)}</p>{situationList}</>}
            <NearbyHelp lang={lang} />
          </div>
        </details>
      )}
      <p className="crisis-small">{t("crisisFoot", lang)}</p>
    </div>
  );
}
