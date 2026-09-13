import { t } from "@/lib/i18n";

const KEY: Record<string, string> = { reframe: "msReframe", named_help: "msNamedHelp", noticed: "msNoticed", plan: "msPlan" };

/** One quiet line under a reply when the person did something worth naming. It is not a badge. */
export default function InsightLine({ kind, lang }: { kind: string; lang: string }) {
  return <p className="insight-line"><i aria-hidden /> {t(KEY[kind] ?? "msNoticed", lang)}</p>;
}
