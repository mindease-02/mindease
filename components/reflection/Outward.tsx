import { t } from "@/lib/i18n";

/**
 * The growth visual: a horizon over the last four weeks. The ground rises
 * where more of the person's week pointed at people in their life, and the
 * sun sits higher this week when that share is higher. No number is drawn
 * on it, there is no level, and it goes down as easily as up.
 */
export default function Outward({ trend, outward, lang, id = "outward" }: { trend: number[]; outward: number | null; lang: string; id?: string }) {
  const W = 320, H = 120, pad = 14;
  const pts = trend.map((v, i) => [pad + (i / Math.max(1, trend.length - 1)) * (W - pad * 2), H - pad - Math.max(0, Math.min(1, v)) * (H - pad * 2 - 24)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg className="outward" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`}>
      <title id={`${id}-t`}>{t("outwardHint", lang)}</title>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-secondary)" stopOpacity=".38" />
          <stop offset="1" stopColor="var(--color-secondary)" stopOpacity=".04" />
        </linearGradient>
      </defs>
      <circle cx={last[0]} cy={Math.max(pad + 8, last[1] - 22)} r={7 + (trend[trend.length - 1] ?? 0) * 6} fill="var(--color-primary)" fillOpacity=".9" />
      <path d={area} fill={`url(#${id}-g)`} />
      <path d={line} fill="none" stroke="var(--color-secondary)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="currentColor" strokeOpacity=".18" />
      <text x={pad} y={H - 2} fontSize="9" fill="currentColor" fillOpacity=".55">{t("wk4", lang)}</text>
      <text x={W - pad} y={H - 2} fontSize="9" textAnchor="end" fill="currentColor" fillOpacity=".55">{t("wkTitle", lang)}</text>
      {outward !== null && <text x={last[0] - 14} y={Math.max(pad + 8, last[1] - 22) + 3} fontSize="9" textAnchor="end" fill="currentColor" fillOpacity=".7">{Math.round(outward * 100)}%</text>}
    </svg>
  );
}
