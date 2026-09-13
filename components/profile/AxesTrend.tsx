import { t } from "@/lib/i18n";

/**
 * How the emotion read has changed, eight small lines over eight weeks, one per axis,
 * each in its own colour. Gaps are weeks with no conversation. No totals, no scores.
 */
export default function AxesTrend({ series, lang }: { series: { label: string; values: (number | null)[] }[]; lang: string }) {
  const W = 132, H = 40, pad = 3;
  const any = series.some((s) => s.values.some((v) => v !== null));
  if (!any) return <p className="muted">{t("trendEmpty", lang)}</p>;
  return (
    <div className="axes-trend">
      {series.map((s) => {
        const n = s.values.length;
        const pts = s.values.map((v, i) => (v === null ? null : [pad + (i / Math.max(1, n - 1)) * (W - pad * 2), H - pad - v * (H - pad * 2)] as const));
        const segs: string[] = []; let cur = "";
        pts.forEach((p) => { if (!p) { if (cur) segs.push(cur); cur = ""; } else cur += `${cur ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`; });
        if (cur) segs.push(cur);
        const last = [...s.values].reverse().find((v) => v !== null);
        const first = s.values.find((v) => v !== null);
        const delta = last !== undefined && first !== undefined && last !== null && first !== null ? last - first : 0;
        return (
          <figure key={s.label} className="axes-cell" style={{ ["--ax" as string]: `var(--ax-${s.label})` }}>
            <figcaption><span>{t(`ax_${s.label}`, lang)}</span><em>{Math.abs(delta) < 0.05 ? t("trendSteady", lang) : delta > 0 ? t("trendUp", lang) : t("trendDown", lang)}</em></figcaption>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t(`ax_${s.label}`, lang)}: ${s.values.map((v) => (v === null ? "-" : v.toFixed(2))).join(", ")}`}>
              <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="currentColor" strokeOpacity=".12" />
              {segs.map((d, i) => <path key={i} d={d} fill="none" stroke="var(--ax)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />)}
              {pts.map((p, i) => p && i === n - 1 ? <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill="var(--ax)" /> : null)}
            </svg>
          </figure>
        );
      })}
    </div>
  );
}
