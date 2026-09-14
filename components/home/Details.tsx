import { t } from "@/lib/i18n";
import Reveal from "./Reveal";
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
    <Reveal as="section" id="details" className="block details" aria-labelledby="details-title">
      <div className="container">
        <div className="sec-head" data-reveal>
          <h2 id="details-title" className="display">{t("detailsTitle", lang)}</h2>
          <p>{t("detailsSub", lang)}</p>
        </div>
        <details className="dt" open data-reveal style={{ ["--d" as string]: "80ms" }}>
          <summary>{t("tryTitle", lang)}</summary>
          <div className="dt-body"><TryMirror lang={lang} embedded /></div>
        </details>
        <details className="dt" data-reveal style={{ ["--d" as string]: "160ms" }}>
          <summary>{t("f2T", lang)}</summary>
          <div className="dt-body"><FeatMemory lang={lang} embedded /></div>
        </details>
        <details className="dt" data-reveal style={{ ["--d" as string]: "240ms" }}>
          <summary>{t("f3T", lang)}</summary>
          <div className="dt-body"><FeatCheckins lang={lang} embedded /></div>
        </details>
        <details className="dt" data-reveal style={{ ["--d" as string]: "320ms" }}>
          <summary>{t("cmpTitle", lang)}</summary>
          <div className="dt-body"><Compare lang={lang} embedded /></div>
        </details>
      </div>
    </Reveal>
  );
}
