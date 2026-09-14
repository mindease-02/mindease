import { sentences, t } from "@/lib/i18n";
import { PxArrow } from "./pixelIcons";
import Reveal, { Words } from "./Reveal";

/** Who made it, what it is, the one button that matters, and the two lines a visitor needs before pressing it. */
export default function Hero({ chatHref, lang }: { chatHref: string; lang: string }) {
  return (
    <Reveal as="section" className="hero-plain" id="top">
      <div className="hero-light" aria-hidden />
      <div className="container hero-inner">
        <p className="tc-eyebrow" data-reveal>Parneeth × Team Archangels</p>
        <h1 className="display hero-title" data-reveal style={{ ["--d" as string]: "80ms" }}><Words text={t("xp1Top", lang)} step={60} /> <span className="hero-accent"><Words text={t("xp1Bottom", lang)} step={60} /></span></h1>
        <p className="hero-sub" data-reveal style={{ ["--d" as string]: "220ms" }}>{t("xp1Sub", lang)}</p>
        <div className="hero-ctas" data-reveal style={{ ["--d" as string]: "320ms" }}>
          <a href={chatHref} className="btn btn-primary">{t("startTalking", lang)} <PxArrow className="pxicon" /></a>
          <a href="#demo" className="btn">{t("seeIt", lang)}</a>
        </div>
        <p className="hero-note" data-reveal style={{ ["--d" as string]: "420ms" }}>{sentences(t("footNot", lang), t("priceLine", lang))}</p>
        <a href="#why" className="scroll-hint" data-reveal style={{ ["--d" as string]: "700ms" }} aria-label={t("navWhy", lang)}><i /><i /></a>
      </div>
    </Reveal>
  );
}
