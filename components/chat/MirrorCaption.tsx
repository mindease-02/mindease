"use client";
import { useId, useState } from "react";
import { t } from "@/lib/i18n";
import { tx } from "@/lib/i18n/tx";
import { AXES, type Axis } from "@/lib/reading/corrections";
import type { Octant } from "@/lib/affect/octant";
import MemoryCard, { type MemoryLite } from "./MemoryCard";
import { PxCheck, PxRefresh, PxRemove } from "../home/pixelIcons";

export interface Caption {
  axes: Octant;
  confidence: number;
  states: string[];
  need: string | null;
  why: string;
  source: string;
  used: MemoryLite[];
  raised: boolean;
}

const REASONS = ["too_long", "too_many_questions", "just_listen", "more_practical", "too_cheerful", "missed_point"] as const;

/**
 * The Mirror caption under a reply: one quiet line saying what MindEase read
 * and how sure it is, a "why?" that opens the detail, and three small ways to
 * answer back: correct the read, say it helped, say it missed. All optional.
 */
export default function MirrorCaption({ c, lang, replyAt, replyLength }: { c: Caption; lang: string; replyAt: number; replyLength: number }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [corrected, setCorrected] = useState<Axis | null>(null);
  const [verdict, setVerdict] = useState<"helped" | "missed" | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const top = AXES.map((a) => ({ a, v: c.axes[a] })).sort((x, y) => y.v - x.v);
  const lead = top[0].v >= 0.15 ? top[0] : null;
  const band = c.confidence >= 0.7 ? "confHigh" : c.confidence >= 0.45 ? "confSome" : "confLow";

  async function post(url: string, body: Record<string, unknown>) {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  }
  async function correct(meant: Axis) {
    setCorrected(meant); setCorrecting(false);
    await post("/api/read", { messageAt: replyAt, said: top[0].a, meant });
  }
  async function rate(v: "helped" | "missed", r?: string) {
    setVerdict(v); if (v === "missed") setReason(r ?? "");
    await post("/api/feedback/reply", { replyAt, verdict: v, reason: r, replyLength });
  }

  // One live region for whatever was just acknowledged, so it is read out once.
  const note = corrected ? tx("capHeld", lang, "Noted. I'll hold that.") : verdict === "helped" ? t("fbThanks", lang) : verdict === "missed" && reason !== null ? t("fbLearned", lang) : "";
  const ax = (a: Axis) => ({ ["--ax" as string]: `var(--ax-${a})` });

  return (
    <div className="caption">
      <div className="caption-line">
        <span className="caption-read">
          {lead
            ? <><span className="caption-label">{t("capRead", lang)}</span> <span className="caption-axis" style={ax(lead.a)}>{t(`ax_${lead.a}`, lang)} {lead.v.toFixed(2)}</span>, </>
            : <>{t("capNothing", lang)} </>}
          <span className={`caption-conf ${band}`}>{t(band, lang)}</span>
          <span className="caption-dot" aria-hidden> · </span>
          <button type="button" className="caption-why" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>{open ? t("rsHide", lang) : tx("capWhyBtn", lang, "why?")}</button>
        </span>
        <span className="caption-acts">
          {!corrected && <button type="button" className="caption-ib notquite" aria-label={t("capNotQuite", lang)} title={t("capNotQuite", lang)} aria-expanded={correcting} onClick={() => setCorrecting((v) => !v)}><PxRefresh className="pxicon" /></button>}
          {!verdict && <button type="button" className="caption-ib helped" aria-label={t("fbHelped", lang)} title={t("fbHelped", lang)} onClick={() => rate("helped")}><PxCheck className="pxicon" /></button>}
          {!verdict && <button type="button" className="caption-ib missed" aria-label={t("fbMissed", lang)} title={t("fbMissed", lang)} onClick={() => setVerdict("missed")}><PxRemove className="pxicon" /></button>}
        </span>
        <span className="caption-live" aria-live="polite">{note}</span>
      </div>

      {correcting && (
        <div className="caption-pick" role="group" aria-label={t("capWhich", lang)}>
          <span>{t("capWhich", lang)}</span>
          {AXES.filter((a) => a !== top[0].a).map((a) => <button key={a} type="button" onClick={() => correct(a)} style={ax(a)}><i />{t(`axw_${a}`, lang)}</button>)}
        </div>
      )}
      {verdict === "missed" && reason === null && (
        <div className="caption-pick" role="group" aria-label={t("fbWhy", lang)}>
          <span>{t("fbWhy", lang)}</span>
          {REASONS.map((r) => <button key={r} type="button" onClick={() => rate("missed", r)}>{t(`fb_${r}`, lang)}</button>)}
          <button type="button" onClick={() => rate("missed")}>{t("fbSkip", lang)}</button>
        </div>
      )}

      {open && (
        <div id={id} className="caption-detail">
          <ul className="caption-bars" aria-label={tx("capBarsTop", lang, "The three strongest of eight axes")}>
            {top.slice(0, 3).map((x) => (
              <li key={x.a} className="caption-bar" style={ax(x.a)}>
                <span>{t(`ax_${x.a}`, lang)}</span><i aria-hidden><b style={{ width: `${Math.round(x.v * 100)}%` }} /></i><em>{x.v.toFixed(2)}</em>
              </li>
            ))}
          </ul>
          <dl className="reason-body">
            {c.states.length > 0 && <div><dt>{t("rsRead", lang)}</dt><dd>{c.states.join(", ")}</dd></div>}
            {c.need && c.need !== "unclear" && <div><dt>{t("rsNeed", lang)}</dt><dd>{t(`need_${c.need}`, lang)}</dd></div>}
            {c.why && <div><dt>{t("capWhy", lang)}</dt><dd>{c.why}</dd></div>}
            {c.raised && <div><dt>{t("capSafety", lang)}</dt><dd>{t("rsSafety", lang)}</dd></div>}
          </dl>
          {c.used.length > 0 && <div className="caption-mem"><span>{t("capHadInMind", lang)}</span>{c.used.slice(0, 2).map((m) => <MemoryCard key={m.id} m={m} lang={lang} mode="brought" />)}</div>}
          <p className="caption-foot">{c.source === "model" ? t("capSourceModel", lang) : t("capSourceWords", lang)}</p>
        </div>
      )}
    </div>
  );
}
