"use client";
/**
 * Grounding techniques, opened automatically when someone arrives angry and
 * available to anyone from the header. Guided box breathing with an animated
 * ring, the physiological sigh, 5-4-3-2-1 grounding, and "move it" for anger.
 * Nothing here is clinical advice; it's the stuff that works in the next five
 * minutes.
 */
import { useEffect, useRef, useState } from "react";
import { popIn } from "@/lib/motion";
import { PxRemove } from "../home/pixelIcons";
import { t } from "@/lib/i18n";

type Kind = "box" | "sigh" | "ground" | "move";
type Phase = "in" | "hold" | "out" | "sip" | "long" | "rest";
const PHASES: Record<"box" | "sigh", [Phase, number][]> = { box: [["in", 4], ["hold", 4], ["out", 4], ["hold", 4]], sigh: [["in", 2], ["sip", 1], ["long", 6], ["rest", 2]] };
const PHASE_KEY: Record<Phase, string> = { in: "breatheIn", hold: "hold", out: "breatheOut", sip: "sipIn", long: "longOut", rest: "rest" };

export default function Techniques({ mood, onClose, initial, lang = "en" }: { mood: string | null; onClose: () => void; initial?: Kind; lang?: string }) {
  const [kind, setKind] = useState<Kind>(initial ?? (mood === "anxious" ? "sigh" : "box"));
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(0);
  const [round, setRound] = useState(0);
  const phases = kind === "sigh" ? PHASES.sigh : PHASES.box;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { popIn(root.current); }, []);

  useEffect(() => {
    if (!running) return;
    setLeft(phases[phase][1]);
    const tm = setInterval(() => setLeft((l) => {
      if (l > 1) return l - 1;
      setPhase((p) => { const n = (p + 1) % phases.length; if (n === 0) setRound((r) => r + 1); return n; });
      return 0;
    }), 1000);
    return () => clearInterval(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, kind]);

  const used = useRef(new Set<Kind>());
  /** Counts a tool once per session of the panel, only when the person starts or finishes it. */
  function record(k: Kind) {
    if (used.current.has(k)) return; used.current.add(k);
    fetch("/api/tools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: k }) }).catch(() => {});
  }
  const [done, setDone] = useState<Kind | null>(null);
  const ph = phases[phase][0];
  const scale = !running ? 0.7 : ph === "in" || ph === "sip" ? 1 : ph === "out" || ph === "long" ? 0.62 : undefined;
  const tabs: [Kind, string][] = [["box", "techBox"], ["sigh", "techSigh"], ["ground", "techGround"], ["move", "techMove"]];

  return (
    <div ref={root} className="techniques" role="region" aria-label={t("techEyebrow", lang)}>
      <div className="t-head">
        <div>
          <div className="eyebrow">{mood === "angry" ? t("techEyebrowAngry", lang) : mood === "anxious" ? t("techEyebrowAnxious", lang) : t("techEyebrow", lang)}</div>
          <p className="muted t-sub">{mood === "angry" ? t("techSubAngry", lang) : t("techSub", lang)}</p>
        </div>
        <button className="clay-btn px-3 py-1.5 text-xs" onClick={onClose} aria-label={t("closeTech", lang)}><PxRemove className="pxicon" style={{ fontSize: 18 }} /></button>
      </div>
      <div className="t-tabs">
        {tabs.map(([k, l]) => (
          <button key={k} className={`t-tab ${kind === k ? "on" : ""}`} onClick={() => { setKind(k); setRunning(false); setPhase(0); setRound(0); }}>{t(l, lang)}</button>
        ))}
      </div>

      {(kind === "box" || kind === "sigh") && (
        <div className="t-breathe">
          <div className="t-ring" style={{ transform: `scale(${scale ?? 1})`, transitionDuration: running ? `${phases[phase][1]}s` : ".6s" }}>
            <span>{running ? t(PHASE_KEY[ph], lang) : t("ready", lang)}</span>
            {running && <small>{left}</small>}
          </div>
          <div className="t-controls">
            <button className="clay-btn-primary px-4 py-2 text-sm" onClick={() => { if (!running) record(kind); setRunning((r) => !r); setPhase(0); }}>{running ? t("stop", lang) : t("start", lang)}</button>
            <span className="muted t-round">{running ? `${t("round", lang)} ${round + 1} · ${kind === "box" ? t("boxBlurb", lang) : t("sighBlurb", lang)}` : kind === "box" ? t("boxRounds", lang) : t("sighRounds", lang)}</span>
          </div>
        </div>
      )}

      {kind === "ground" && (
        <ol className="t-list">
          {(["5", "4", "3", "2", "1"] as const).map((n) => <li key={n}><b>{n}</b><span>{t(`gr${n}`, lang)}</span></li>)}
        </ol>
      )}

      {kind === "move" && (
        <ol className="t-list">
          {(["1", "2", "3", "4"] as const).map((n) => <li key={n}><b>{n}</b><span>{t(`m${n}`, lang)}</span></li>)}
        </ol>
      )}
      {(kind === "ground" || kind === "move") && (
        <div className="t-controls" style={{ marginTop: 12 }}>
          <button className="clay-btn px-4 py-2 text-sm" disabled={done === kind} onClick={() => { record(kind); setDone(kind); }}>{done === kind ? t("noted", lang) : t("didThis", lang)}</button>
        </div>
      )}
    </div>
  );
}
