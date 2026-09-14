import { t } from "@/lib/i18n";
import TryMirror from "./TryMirror";
import Compare from "./Compare";
import { FeatCheckins, FeatMemory } from "./Sections";

/**
 * The mechanics, after the call to action rather than before it. Each block
 * opens on a tap; the live read is open by default because it is the one a
 * visitor can actually try.
 */
export default function Details({ lang }: { lang: string }) {
  return (
    <section id="details" className="block details" aria-labelledby="details-title">
      <div className="container">
        <div className="sec-head">
          <h2 id="details-title" className="display">{t("detailsTitle", lang)}</h2>
          <p>{t("detailsSub", lang)}</p>
        </div>
        <details className="dt" open>
          <summary>{t("tryTitle", lang)}</summary>
          <div className="dt-body"><TryMirror lang={lang} embedded /></div>
        </details>
        <details className="dt">
          <summary>{t("f2T", lang)}</summary>
          <div className="dt-body"><FeatMemory lang={lang} embedded /></div>
        </details>
        <details className="dt">
          <summary>{t("f3T", lang)}</summary>
          <div className="dt-body"><FeatCheckins lang={lang} embedded /></div>
        </details>
        <details className="dt">
          <summary>{t("cmpTitle", lang)}</summary>
          <div className="dt-body"><Compare lang={lang} embedded /></div>
        </details>
      </div>
    </section>
  );
}
