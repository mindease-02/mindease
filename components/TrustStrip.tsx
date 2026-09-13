import { t } from "@/lib/i18n";

/**
 * One line, on every page, that says what MindEase is and where real help is.
 * The numbers are live links so the line is useful, not decorative.
 */
export default function TrustStrip({ lang, className = "" }: { lang: string; className?: string }) {
  const line = t("trustLine", lang);
  const parts = line.split(/(14416|112)/);
  return (
    <div className={`trust-strip ${className}`} role="note">
      <span>
        {parts.map((p, i) => p === "14416" || p === "112"
          ? <a key={i} href={`tel:${p}`}>{p}</a>
          : <span key={i}>{p}</span>)}
      </span>
    </div>
  );
}
