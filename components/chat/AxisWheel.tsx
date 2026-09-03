"use client";
import { OCTANT_AXES, type Octant } from "@/lib/affect/octant";

/** Eight-axis radar. Weather (today) over climate (recent days). */
export default function AxisWheel({ weather, climate, size = 220 }: { weather: Octant; climate?: Octant; size?: number }) {
  const c = size / 2, r = size / 2 - 26;
  const pt = (i: number, v: number) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] as const;
  };
  const poly = (o: Octant) => OCTANT_AXES.map((ax, i) => pt(i, Math.max(0.04, o[ax])).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img" aria-label="eight-axis emotion wheel">
      {[0.25, 0.5, 0.75, 1].map((k) => <circle key={k} cx={c} cy={c} r={r * k} fill="none" stroke="#d9cdbf" strokeWidth={1} />)}
      {OCTANT_AXES.map((ax, i) => { const [x, y] = pt(i, 1); return <line key={ax} x1={c} y1={c} x2={x} y2={y} stroke="#d9cdbf" strokeWidth={1} />; })}
      {climate && <polygon points={poly(climate)} fill="rgba(126,200,216,.25)" stroke="#7ec8d8" strokeWidth={1.5} />}
      <polygon points={poly(weather)} fill="rgba(232,145,122,.35)" stroke="#e8917a" strokeWidth={2} strokeLinejoin="round" />
      {OCTANT_AXES.map((ax, i) => { const [x, y] = pt(i, 1.17); return <text key={ax} x={x} y={y} fontSize={10} textAnchor="middle" dominantBaseline="middle" fill="#7d7168">{ax}</text>; })}
    </svg>
  );
}
