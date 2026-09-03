"use client";
export default function Sparkline({ points, width = 260, height = 56 }: { points: { at: number; v: number; c: number }[]; width?: number; height?: number }) {
  if (points.length < 2) return <div className="text-xs text-clay-muted">Not enough history for a line yet.</div>;
  const xs = points.map((p) => p.at), min = Math.min(...xs), max = Math.max(...xs) || min + 1;
  const X = (t: number) => 6 + ((t - min) / (max - min || 1)) * (width - 12);
  const Y = (v: number) => height / 2 - v * (height / 2 - 6);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(p.at).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: width }} role="img" aria-label="mood over recent turns">
      <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="3 3" />
      <path d={d} fill="none" stroke="#e8917a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={X(p.at)} cy={Y(p.v)} r={2.2} fill="currentColor" opacity={0.25 + p.c * 0.75} />)}
    </svg>
  );
}
