import { sentences, t } from "@/lib/i18n";
import { PxArrow } from "./pixelIcons";

/** Who made it, what it is, the one button that matters, and the two lines a visitor needs before pressing it. */
export default function Hero({ chatHref, lang }: { chatHref: string; lang: string }) {
  return (
    <section className="hero-plain" id="top">
      <div className="hero-light" aria-hidden />
      <div className="container hero-inner">
        <p className="tc-eyebrow">Parneeth × Team Archangels</p>
        <h1 className="display hero-title">{t("xp1Top", lang)} <span className="hero-accent">{t("xp1Bottom", lang)}</span></h1>
        <p className="hero-sub">{t("xp1Sub", lang)}</p>
        <div className="hero-ctas">
          <a href={chatHref} className="btn btn-primary">{t("startTalking", lang)} <PxArrow className="pxicon" /></a>
          <a href="#demo" className="btn">{t("seeIt", lang)}</a>
        </div>
        <p className="hero-note">{sentences(t("footNot", lang), t("priceLine", lang))}</p>
      </div>
    </section>
  );
}
