import { t } from "@/lib/i18n";
import Magnetic from "./Magnetic";
import { PxArrow, PxEye, PxBrain, PxBell, PxShield, PxHeart, PxMessage } from "./pixelIcons";

/**
 * The opening of the site: who made it, what it is, and the one button that
 * matters. Below it, the six ideas of the old scroll story as plain cards, so
 * the whole pitch is readable in one screen-and-a-half with no scrolling
 * choreography.
 */
export default function Hero({ chatHref, lang }: { chatHref: string; lang: string }) {
  const pillars = [
    { icon: <PxEye />, top: "xp1Top", bottom: "xp1Bottom", sub: "xp1Sub" },
    { icon: <PxHeart />, top: "xp2Top", bottom: "xp2Bottom", sub: "xp2Sub" },
    { icon: <PxBrain />, top: "xp3Top", bottom: "xp3Bottom", sub: "xp3Sub" },
    { icon: <PxBell />, top: "xp4Top", bottom: "xp4Bottom", sub: "xp4Sub" },
    { icon: <PxShield />, top: "xp5Top", bottom: "xp5Bottom", sub: "xp5Sub" },
    { icon: <PxMessage />, top: "xp6Top", bottom: "xp6Bottom", sub: "xp6Sub" },
  ];
  return (
    <>
      <section className="hero-plain" id="top">
        <div className="hero-light" aria-hidden />
        <div className="container hero-inner">
          <p className="tc-eyebrow">Parneeth × Team Archangels</p>
          <h1 className="display hero-title">{t("xp1Top", lang)} <span className="hero-accent">{t("xp1Bottom", lang)}</span></h1>
          <p className="hero-sub">{t("xp1Sub", lang)}</p>
          <div className="hero-ctas">
            <Magnetic href={chatHref} className="btn-primary">{t("startTalking", lang)} <PxArrow className="pxicon" /></Magnetic>
            <a href="#demo" className="btn">{t("seeIt", lang)}</a>
          </div>
          <p className="hero-note">{t("disclaimer", lang)}</p>
        </div>
      </section>
      <section className="pillars" aria-label={t("whatItDoes", lang)}>
        <div className="container pillars-grid">
          {pillars.map((p) => (
            <div key={p.top} className="pillar">
              <span className="pillar-ico" aria-hidden>{p.icon}</span>
              <h2 className="display">{t(p.top, lang)} {t(p.bottom, lang)}</h2>
              <p>{t(p.sub, lang)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
