import { t } from "@/lib/i18n";

/**
 * The contrast section: what MindEase does against what companion apps tend
 * to do. Patterns, not names; nothing here grades a competitor.
 */
export default function Compare({ lang }: { lang: string }) {
  const rows = [1, 2, 3, 4, 5, 6];
  return (
    <section id="compare" className="block cmp-block" aria-labelledby="cmp-title">
      <div className="container">
        <div className="sec-head">
          <p className="cmp-eyebrow">{t("cmpEyebrow", lang)}</p>
          <h2 id="cmp-title" className="display">{t("cmpTitle", lang)}</h2>
        </div>
        <div className="cmp-wrap">
          <table className="cmp">
            <thead>
              <tr><th scope="col"><span className="sr-only">Topic</span></th><th scope="col" className="cmp-us">{t("cmpCol1", lang)}</th><th scope="col">{t("cmpCol2", lang)}</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r}>
                  <th scope="row">{t(`cmpR${r}`, lang)}</th>
                  <td className="cmp-us" data-label={t("cmpCol1", lang)}>{t(`cmpR${r}a`, lang)}</td>
                  <td data-label={t("cmpCol2", lang)}>{t(`cmpR${r}b`, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cmp-note">{t("cmpNote", lang)}</p>
      </div>
    </section>
  );
}
