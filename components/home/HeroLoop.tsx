"use client";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { tx } from "@/lib/i18n/tx";
import { reduced } from "@/lib/motion";

/**
 * A decorative loop beside the title: one of the sandbox lines types itself
 * out, then the read behind it fades in as a few axis chips. The numbers are
 * fixed, plausible examples and the card says so; the live version of the
 * same idea is the demo chapter, so this one is aria-hidden. With reduced
 * motion it shows the first line and its read, no typing.
 */
type Axis = "ax_joy" | "ax_trust" | "ax_fear" | "ax_surprise" | "ax_sadness" | "ax_disgust" | "ax_anger" | "ax_anticipation";
const LINES: { key: string; read: [Axis, number][] }[] = [
  { key: "tryQ1s", read: [["ax_fear", 0.62], ["ax_anticipation", 0.35], ["ax_sadness", 0.18]] },
  { key: "tryQ2s", read: [["ax_sadness", 0.58], ["ax_fear", 0.29], ["ax_anger", 0.14]] },
  { key: "tryQ3s", read: [["ax_fear", 0.51], ["ax_anticipation", 0.44], ["ax_sadness", 0.17]] },
];
const TYPE_MS = 46, HOLD_MS = 700, READ_MS = 2800, OUT_MS = 520, GAP_MS = 260;
type Phase = "type" | "hold" | "read" | "out";

export default function HeroLoop({ lang }: { lang: string }) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [phase, setPhase] = useState<Phase>("type");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current; if (!el) return;
    if (reduced()) { setI(0); setN(t(LINES[0].key, lang).length); setPhase("read"); return; }
    let timer = 0, alive = true, visible = true, line = 0, typed = 0;
    // Only spend the timers while the card is on screen.
    const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }, { threshold: 0.1 }) : null;
    io?.observe(el);
    const wait = (ms: number, fn: () => void) => { timer = window.setTimeout(() => { if (!alive) return; if (!visible) { wait(400, fn); return; } fn(); }, ms); };
    const text = () => t(LINES[line].key, lang);
    const step = () => {
      const s = text();
      if (typed < s.length) {
        typed += 1; setN(typed);
        wait(TYPE_MS + (s[typed - 1] === " " ? 40 : 0) + Math.random() * 28, step);
        return;
      }
      setPhase("hold");
      wait(HOLD_MS, () => { setPhase("read"); wait(READ_MS, () => { setPhase("out"); wait(OUT_MS, () => {
        line = (line + 1) % LINES.length; typed = 0; setI(line); setN(0); setPhase("type"); wait(GAP_MS, step);
      }); }); });
    };
    wait(600, step);
    return () => { alive = false; clearTimeout(timer); io?.disconnect(); };
  }, [lang]);

  const line = LINES[i]; const text = t(line.key, lang);
  return (
    <div ref={root} className="hero-loop glass-card" aria-hidden="true" data-phase={phase} data-reveal style={{ ["--d" as string]: "900ms" }}>
      <div className="loop-head"><i className="loop-dot" />MindEase<span className="loop-tag">{t("demoLabel", lang)}</span></div>
      <div className="loop-body">
        <p className="loop-you"><span>{text.slice(0, n)}</span><i className="loop-caret" /></p>
        <div className="loop-read">
          <div>
            <span className="loop-k">{tx("heroLoopRead", lang, "what it noticed")}</span>
            <div className="loop-chips">
              {line.read.map(([k, v], j) => (
                <span key={k} className="loop-chip" style={{ ["--v" as string]: v, ["--j" as string]: j }}><i className="loop-bar" />{t(k, lang)}<b>{v.toFixed(2)}</b></span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
