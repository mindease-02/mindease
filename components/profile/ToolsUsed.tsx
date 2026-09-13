import { t } from "@/lib/i18n";

const NAME: Record<string, string> = { box: "techBox", sigh: "techSigh", ground: "techGround", move: "techMove" };
const SCREEN: Record<string, string> = { phq9: "PHQ-9", gad7: "GAD-7", isi: "ISI" };

/** The coping tools a person has actually started, most used first. A list, not a trophy case. */
export default function ToolsUsed({ tools, lang }: { tools: { kind: string; count: number }[]; lang: string }) {
  if (!tools.length) return <p className="muted tools-none">{t("skNone", lang)}</p>;
  return (
    <ul className="tools-list">
      {tools.map((x) => {
        const name = x.kind.startsWith("screening:") ? t("skScreen", lang, { name: SCREEN[x.kind.slice(10)] ?? x.kind.slice(10) }) : t(NAME[x.kind] ?? x.kind, lang);
        return <li key={x.kind}><b>{name}</b><span>{x.count === 1 ? t("skOnce", lang) : t("skTried", lang, { n: String(x.count) })}</span></li>;
      })}
    </ul>
  );
}
