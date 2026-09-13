"use client";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";

const AXES = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"] as const;
type Vals = number[];

/**
 * The eight-axis read, drawn as it forms. Each MindEase line in the demo moves
 * the shape toward that turn's read; with reduced motion it simply jumps.
 */
export default function DemoGauge({ target, lang, confidence }: { target: Vals; lang: string; confidence: number | null }) {
  const [vals, setVals] = useState<Vals>(AXES.map(() => 0));
  const from = useRef<Vals>(vals);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setVals(target); from.current = target; return; }
    const start = performance.now(), dur = 900, a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
      const next = a.map((v, i) => v + (target[i] - v) * e);
      setVals(next);
      if (k < 1) raf = requestAnimationFrame(step); else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const C = 90, R = 64;
  const pt = (v: number, i: number, r = R) => { const ang = (i / 8) * Math.PI * 2 - Math.PI / 2; return [C + Math.cos(ang) * r * v, C + Math.sin(ang) * r * v] as const; };
  const poly = vals.map((v, i) => pt(Math.max(0.04, v), i).map((n) => n.toFixed(1)).join(",")).join(" ");
  const top = AXES.map((a, i) => ({ a, v: vals[i] })).sort((x, y) => y.v - x.v).filter((x) => x.v > 0.2).slice(0, 2);

  return (
    <figure className="demo-gauge" aria-live="polite">
      <svg viewBox="0 0 180 180" role="img" aria-label={`${t("capRead", lang)} ${top.map((x) => `${t(`ax_${x.a}`, lang)} ${x.v.toFixed(2)}`).join(", ")}`}>
        {[0.5, 1].map((r) => <circle key={r} cx={C} cy={C} r={R * r} fill="none" stroke="currentColor" strokeOpacity=".1" />)}
        {AXES.map((a, i) => { const [x, y] = pt(1, i); return <line key={a} x1={C} y1={C} x2={x} y2={y} stroke="currentColor" strokeOpacity=".08" />; })}
        <polygon points={poly} fill="var(--color-primary)" fillOpacity=".16" stroke="var(--color-primary)" strokeOpacity=".7" strokeWidth="1.2" strokeLinejoin="round" />
        {AXES.map((a, i) => { const [x, y] = pt(Math.max(0.04, vals[i]), i); return <circle key={a} cx={x} cy={y} r={2 + vals[i] * 3} fill={`var(--ax-${a})`} />; })}
        {AXES.map((a, i) => { const [x, y] = pt(1.24, i); return <text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8.5" fill={`var(--ax-${a})`} fillOpacity={vals[i] > 0.2 ? 1 : 0.45}>{t(`ax_${a}`, lang)}</text>; })}
      </svg>
      <figcaption>
        {top.length ? top.map((x) => `${t(`ax_${x.a}`, lang)} ${x.v.toFixed(2)}`).join(", ") : t("gaugeWaiting", lang)}
        {confidence !== null && top.length > 0 && <span className="caption-conf">{t(confidence >= 0.7 ? "confHigh" : confidence >= 0.45 ? "confSome" : "confLow", lang)}</span>}
      </figcaption>
    </figure>
  );
}
