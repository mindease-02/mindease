"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { AXES, type Axis } from "@/lib/reading/corrections";
import type { Octant } from "@/lib/affect/octant";
import MemoryCard, { type MemoryLite } from "./MemoryCard";

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
 * The Mirror caption under a reply: what MindEase read, how sure it is, and
 * the two things a person can do about it. Correct the read, or say whether
 * the reply helped. Both teach it; neither is required.
 */
export default function MirrorCaption({ c, lang, replyAt, replyLength }: { c: Caption; lang: string; replyAt: number; replyLength: number }) {
  const [open, setOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [corrected, setCorrected] = useState<Axis | null>(null);
  const [verdict, setVerdict] = useState<"helped" | "missed" | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const top = AXES.map((a) => ({ a, v: c.axes[a] })).sort((x, y) => y.v - x.v);
  const shown = top.filter((x) => x.v >= 0.15).slice(0, 3);
  const band = c.confidence >= 0.7 ? "confHigh" : c.confidence >= 0.45 ? "confSome" : "confLow";

  async function post(url: string, body: Record<string, unknown>) {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  }
  async function correct(meant: Axis) {
    setCorrected(meant); setCorrecting(false);
    await post("/api/read", { messageAt: replyAt, said: top[0].a, meant });
  }
  async function rate(v: "helped" | "missed", r?: string) {
    setVerdict(v); if (r) setReason(r);
    await post("/api/feedback/reply", { replyAt, verdict: v, reason: r, replyLength });
  }

  return (
    <div className="caption">
      <div className="caption-line">
        <span className="caption-read">
          {shown.length ? <>{t("capRead", lang)} {shown.map((x, i) => <span key={x.a} className="caption-axis" style={{ ["--ax" as string]: `var(--ax-${x.a})` }}>{t(`ax_${x.a}`, lang)} {x.v.toFixed(2)}{i < shown.length - 1 ? ", " : ""}</span>)}.</> : t("capNothing", lang)}
          {" "}<span className={`caption-conf ${band}`}>{t(band, lang)}</span>
          {corrected && <span className="caption-fixed"> {t("capCorrected", lang, { axis: t(`ax_${corrected}`, lang) })}</span>}
        </span>
        <span className="caption-actions">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? t("rsHide", lang) : t("rsShow", lang)}</button>
          {!corrected && <button type="button" onClick={() => setCorrecting((v) => !v)} aria-expanded={correcting}>{t("capNotQuite", lang)}</button>}
          {!verdict && <><button type="button" onClick={() => rate("helped")}>{t("fbHelped", lang)}</button><button type="button" onClick={() => setVerdict("missed")}>{t("fbMissed", lang)}</button></>}
          {verdict === "helped" && <span className="caption-note">{t("fbThanks", lang)}</span>}
        </span>
      </div>

      {correcting && (
        <div className="caption-pick" role="group" aria-label={t("capWhich", lang)}>
          <span>{t("capWhich", lang)}</span>
          {AXES.filter((a) => a !== top[0].a).map((a) => <button key={a} type="button" onClick={() => correct(a)} style={{ ["--ax" as string]: `var(--ax-${a})` }}><i />{t(`axw_${a}`, lang)}</button>)}
        </div>
      )}
      {verdict === "missed" && !reason && (
        <div className="caption-pick" role="group" aria-label={t("fbWhy", lang)}>
          <span>{t("fbWhy", lang)}</span>
          {REASONS.map((r) => <button key={r} type="button" onClick={() => rate("missed", r)}>{t(`fb_${r}`, lang)}</button>)}
          <button type="button" onClick={() => rate("missed")}>{t("fbSkip", lang)}</button>
        </div>
      )}
      {verdict === "missed" && reason !== null && <p className="caption-note">{t("fbLearned", lang)}</p>}

      {open && (
        <div className="caption-detail">
          <div className="caption-bars" role="img" aria-label={t("capBarsLabel", lang)}>
            {AXES.map((a) => (
              <div key={a} className="caption-bar" style={{ ["--ax" as string]: `var(--ax-${a})` }}>
                <span>{t(`ax_${a}`, lang)}</span><i><b style={{ width: `${Math.round(c.axes[a] * 100)}%` }} /></i><em>{c.axes[a].toFixed(2)}</em>
              </div>
            ))}
          </div>
          <dl className="reason-body">
            {c.states.length > 0 && <div><dt>{t("rsRead", lang)}</dt><dd>{c.states.join(", ")}</dd></div>}
            {c.need && c.need !== "unclear" && <div><dt>{t("rsNeed", lang)}</dt><dd>{t(`need_${c.need}`, lang)}</dd></div>}
            {c.why && <div><dt>{t("capWhy", lang)}</dt><dd>{c.why}</dd></div>}
            {c.raised && <div><dt>{t("capSafety", lang)}</dt><dd>{t("rsSafety", lang)}</dd></div>}
          </dl>
          {c.used.length > 0 && <div className="caption-mem"><span>{t("capHadInMind", lang)}</span>{c.used.map((m) => <MemoryCard key={m.id} m={m} lang={lang} mode="brought" />)}</div>}
          <p className="caption-foot">{c.source === "model" ? t("capSourceModel", lang) : t("capSourceWords", lang)}</p>
        </div>
      )}
    </div>
  );
}
