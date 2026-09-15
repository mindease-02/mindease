import { t } from "@/lib/i18n";

/**
 * The contrast section: what MindEase does against what companion apps tend
 * to do, as two cards side by side. Patterns, not names; nothing here grades
 * a competitor.
 */
export default function Compare({ lang, embedded = false }: { lang: string; embedded?: boolean }) {
  const rows = [1, 2, 3, 4, 5, 6];
  const cards = (
    <>
      <div className="bento">
        <div className="bento-card us glass-card">
          <h3>{t("cmpCol1", lang)}</h3>
          <ul>{rows.map((r) => <li key={r}><span className="bento-k">{t(`cmpR${r}`, lang)}</span><span>{t(`cmpR${r}a`, lang)}</span></li>)}</ul>
        </div>
        <div className="bento-card them glass-card">
          <h3>{t("cmpCol2", lang)}</h3>
          <ul>{rows.map((r) => <li key={r}><span className="bento-k">{t(`cmpR${r}`, lang)}</span><span>{t(`cmpR${r}b`, lang)}</span></li>)}</ul>
        </div>
      </div>
      <p className="cmp-note">{t("cmpNote", lang)}</p>
    </>
  );
  if (embedded) return cards;
  return (
    <section id="compare" className="block cmp-block" aria-labelledby="cmp-title">
      <div className="container">
        <div className="sec-head">
          <p className="cmp-eyebrow">{t("cmpEyebrow", lang)}</p>
          <h2 id="cmp-title" className="display">{t("cmpTitle", lang)}</h2>
        </div>
        {cards}
      </div>
    </section>
  );
}
