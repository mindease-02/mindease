import { t } from "@/lib/i18n";

/**
 * The reason MindEase exists, drawn: over eight weeks the people in someone's
 * life rise while leaning on MindEase falls, and the check-ins thin out. The
 * same two colours the app uses for the same two things in the Mirror, so the
 * promise on the landing page and the reflection inside it read as one thing.
 * Static on purpose; the demo's gauge is the page's one moving moment.
 */
export default function Why({ lang }: { lang: string }) {
  const W = 326, H = 196, top = 24, base = 150;
  const dots = [22, 34, 46, 58, 104, 116, 128, 186, 198, 280];
  return (
    <section id="why" className="block why" aria-labelledby="why-title">
      <div className="container why-grid">
        <div>
          <div className="eyebrow">{t("whyExists", lang)}</div>
          <h2 id="why-title" className="display">{t("storyQ1", lang)}<em>{t("storyEm", lang)}</em>{t("storyQ2", lang)}</h2>
        </div>
        <figure className="why-fig">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("whyAlt", lang)}>
            <defs>
              <linearGradient id="why-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--color-secondary)" stopOpacity=".35" />
                <stop offset="1" stopColor="var(--color-secondary)" stopOpacity=".02" />
              </linearGradient>
            </defs>
            <line x1="10" y1={base} x2={W - 10} y2={base} stroke="currentColor" strokeOpacity=".12" />
            <path d={`M10 118 C 60 112, 100 100, 140 82 S 240 48, ${W - 10} 34 L${W - 10} ${base} L10 ${base} Z`} fill="url(#why-fill)" />
            <path d={`M10 118 C 60 112, 100 100, 140 82 S 240 48, ${W - 10} 34`} fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round" />
            <path d={`M10 40 C 60 46, 110 62, 150 84 S 250 118, ${W - 10} 128`} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
            <text x={W - 20} y={top} fill="var(--color-secondary)" fontSize="11" textAnchor="end">{t("whyPeople", lang)}</text>
            <text x={W - 10} y={base - 6} fill="var(--color-primary)" fontSize="11" textAnchor="end">{t("whyApp", lang)}</text>
            {dots.map((x) => <circle key={x} cx={x} cy={172} r="3.5" fill="var(--color-primary)" fillOpacity=".85" />)}
            <text x="10" y={H - 4} fill="currentColor" fillOpacity=".5" fontSize="10">{t("whyWeek1", lang)}</text>
            <text x={W - 10} y={H - 4} fill="currentColor" fillOpacity=".5" fontSize="10" textAnchor="end">{t("whyWeek8", lang)}</text>
          </svg>
          <figcaption>{t("whyCaption", lang)}</figcaption>
        </figure>
      </div>
    </section>
  );
}
