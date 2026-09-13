import type { WeeklyReflection } from "@/lib/reflection";
import { t } from "@/lib/i18n";
import Outward from "./Outward";

/**
 * The weekly reflection. Four plain counts, one sentence about direction
 * against the person's own previous week, and the horizon. Nothing to earn.
 */
export default function WeekCard({ r, lang, compact = false }: { r: WeeklyReflection; lang: string; compact?: boolean }) {
  const w = r.thisWeek;
  const line = r.direction === "up" ? t("wkUp", lang) : r.direction === "down" ? t("wkDown", lang) : r.direction === "flat" ? t("wkFlat", lang) : t("wkQuiet", lang);
  const rows: [number, string][] = [[w.here, t("wkHere", lang)], [w.people, t("wkPeople", lang)], [w.checkins, t("wkCheckins", lang)], [w.tools, t("wkTools", lang)]];
  return (
    <div className={`week ${compact ? "compact" : ""}`}>
      <Outward trend={r.outwardTrend} outward={r.outward} lang={lang} id={compact ? "ow-c" : "ow"} />
      <ul className="week-rows">
        {rows.map(([n, l]) => <li key={l}><b>{n}</b><span>{l}</span></li>)}
      </ul>
      <p className="week-line">{line}</p>
      {r.steadier && <p className="week-steady">{t("wkSteadier", lang)}</p>}
    </div>
  );
}
