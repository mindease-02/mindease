"use client";
import { useEffect, useId, useRef, useState } from "react";
import { t } from "@/lib/i18n";

const AXES = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"] as const;
type Vals = number[];

/**
 * The eight-axis read, drawn as it forms. Each MindEase line in the demo moves
 * the shape toward that turn's read; with reduced motion it simply jumps. The
 * read is also broadcast as a "me:read" event so the particle field follows it.
 * Under the radar: the two strongest axes as chips and the confidence pill.
 */
export default function DemoGauge({ target, lang, confidence }: { target: Vals; lang: string; confidence: number | null }) {
  const [vals, setVals] = useState<Vals>(AXES.map(() => 0));
  const from = useRef<Vals>(vals);
  const gid = `demo-gauge-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("me:read", { detail: Object.fromEntries(AXES.map((a, i) => [a, target[i]])) }));
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

  const C = 100, R = 72;
  const pt = (v: number, i: number, r = R) => { const ang = (i / 8) * Math.PI * 2 - Math.PI / 2; return [C + Math.cos(ang) * r * v, C + Math.sin(ang) * r * v] as const; };
  const poly = vals.map((v, i) => pt(Math.max(0.04, v), i).map((n) => n.toFixed(1)).join(",")).join(" ");
  const top = AXES.map((a, i) => ({ a, v: vals[i] })).sort((x, y) => y.v - x.v).filter((x) => x.v > 0.2).slice(0, 2);
  const confKey = confidence === null ? null : confidence >= 0.7 ? "confHigh" : confidence >= 0.45 ? "confSome" : "confLow";
  const summary = top.map((x) => `${t(`ax_${x.a}`, lang)} ${x.v.toFixed(2)}`).join(", ");

  return (
    <figure className="demo-gauge" aria-live="polite">
      <svg viewBox="0 0 200 200" role="img" aria-label={`${t("capRead", lang)} ${summary || t("gaugeWaiting", lang)}`}>
        <defs>
          <radialGradient id={gid} cx="50%" cy="50%" r="55%">
            <stop offset="0%" style={{ stopColor: "var(--color-primary)", stopOpacity: 0.42 }} />
            <stop offset="100%" style={{ stopColor: "var(--color-primary)", stopOpacity: 0.08 }} />
          </radialGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((r) => <circle key={r} cx={C} cy={C} r={R * r} fill="none" stroke="currentColor" strokeOpacity={r === 1 ? 0.16 : 0.07} strokeWidth={r === 1 ? 1 : 0.8} />)}
        {AXES.map((a, i) => { const [x, y] = pt(1, i); return <line key={a} x1={C} y1={C} x2={x} y2={y} stroke="currentColor" strokeOpacity=".09" />; })}
        <polygon className="gauge-shape" points={poly} fill={`url(#${gid})`} style={{ stroke: "var(--color-primary)" }} strokeOpacity=".9" strokeWidth="1.4" strokeLinejoin="round" />
        {AXES.map((a, i) => { const [x, y] = pt(Math.max(0.04, vals[i]), i); return <circle key={a} cx={x} cy={y} r={2 + vals[i] * 3.2} style={{ fill: `var(--ax-${a})` }} opacity={0.55 + vals[i] * 0.45} />; })}
        {AXES.map((a, i) => { const [x, y] = pt(1.22, i); return <text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" style={{ fill: `var(--ax-${a})` }} fillOpacity={vals[i] > 0.2 ? 1 : 0.62}>{t(`ax_${a}`, lang)}</text>; })}
      </svg>
      <figcaption>
        {top.length ? (
          <ul className="gauge-top" aria-label={t("capRead", lang)}>
            {top.map((x) => <li key={x.a} style={{ ["--ax" as string]: `var(--ax-${x.a})` }}><i aria-hidden /><span>{t(`ax_${x.a}`, lang)}</span><em>{x.v.toFixed(2)}</em></li>)}
          </ul>
        ) : <span className="gauge-wait">{t("gaugeWaiting", lang)}</span>}
        {confKey && top.length > 0 && <span className={`caption-conf ${confKey}`}>{t(confKey, lang)}</span>}
      </figcaption>
    </figure>
  );
}
