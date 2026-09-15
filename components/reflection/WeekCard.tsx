import type { WeeklyReflection } from "@/lib/reflection";
import { t, countLabel } from "@/lib/i18n";
import Outward from "./Outward";
import PeopleLog from "./PeopleLog";

/**
 * The weekly reflection. Four plain counts, one sentence about direction
 * against the person's own previous week, and the horizon. Nothing to earn.
 */
export default function WeekCard({ r, lang, compact = false }: { r: WeeklyReflection; lang: string; compact?: boolean }) {
  const w = r.thisWeek;
  const line = r.direction === "up" ? t("wkUp", lang) : r.direction === "down" ? t("wkDown", lang) : r.direction === "flat" ? t("wkFlat", lang) : t("wkQuiet", lang);
  const rows: [number, string][] = [[w.people + w.logged, countLabel(w.people + w.logged, t("wkPeopleAll", lang), lang)], [w.conversations, countLabel(w.conversations, t("wkConvos", lang), lang)], [w.checkins, t("wkCheckins", lang)], [w.tools, t("wkTools", lang)]];
  const balance = w.conversations + w.people + w.logged > 0 ? t("wkBalance", lang, { p: String(w.people + w.logged), m: String(w.conversations) }) : null;
  return (
    <div className={`week ${compact ? "compact" : ""}`}>
      <Outward trend={r.outwardTrend} outward={r.outward} lang={lang} id={compact ? "ow-c" : "ow"} />
      <ul className="week-rows">
        {rows.map(([n, l]) => <li key={l}><b>{n}</b><span>{l}</span></li>)}
      </ul>
      {balance && <p className="week-balance">{balance}</p>}
      <p className="week-line">{line}</p>
      {r.steadier && <p className="week-steady">{t("wkSteadier", lang)}</p>}
      <PeopleLog lang={lang} />
    </div>
  );
}
