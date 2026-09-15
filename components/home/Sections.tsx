"use client";
import Link from "next/link";
import Reveal from "./Reveal";
import MemoryCards from "./MemoryCards";
import { t } from "@/lib/i18n";
import { PxHeart, PxStar, PxMoon, PxMessage } from "./pixelIcons";

type L = { lang: string };



export function FeatMemory({ lang, embedded = false }: L & { embedded?: boolean }) {
  return (
    <div className="feat flip">
      <div>
        {!embedded && <h3 className="display">{t("f2T", lang)}</h3>}
        <p>{t("f2P", lang)}</p>
        <ul><li>{t("f2L1", lang)}</li><li>{t("f2L2", lang)}</li><li>{t("f2L3", lang)}</li></ul>
      </div>
      <div className="feat-visual feat-visual-mem">
        <MemoryCards lang={lang} />
      </div>
    </div>
  );
}

/* --------------------------------------------- Check-ins, as three glyphs */
/**
 * The three things a check-in has to pass, drawn rather than listed: two of
 * four signals agreeing, the clock outside quiet hours, one of two used today.
 * Coral marks the state that is true, the faint outline the one that is not.
 */
export function CheckinGlyphs({ lang }: L) {
  return (
    <div className="glyphs" role="img" aria-label={`${t("g1", lang)}. ${t("g2", lang)}. ${t("g3", lang)}: ${t("g3v", lang)}.`}>
      <figure>
        <svg viewBox="0 0 84 44" width="84" height="44"><g>
          <circle cx="12" cy="22" r="8" fill="var(--color-primary)" /><circle cx="32" cy="22" r="8" fill="var(--color-primary)" />
          <circle cx="52" cy="22" r="8" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.5" /><circle cx="72" cy="22" r="8" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.5" />
        </g></svg>
        <figcaption>{t("g1", lang)}</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 44 44" width="44" height="44">
          <circle cx="22" cy="22" r="16" fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth="5" />
          <path d="M22 6 A16 16 0 1 1 8.14 30" fill="none" stroke="var(--color-secondary)" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" />
          <line x1="22" y1="22" x2="31" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="22" cy="22" r="2" fill="currentColor" />
        </svg>
        <figcaption>{t("g2", lang)}</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 44 44" width="44" height="44">
          <rect x="6" y="12" width="14" height="20" rx="5" fill="var(--color-primary)" /><rect x="24" y="12" width="14" height="20" rx="5" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.5" />
        </svg>
        <figcaption>{t("g3v", lang)}</figcaption>
      </figure>
    </div>
  );
}

export function FeatCheckins({ lang, embedded = false }: L & { embedded?: boolean }) {
  return (
    <div className="feat">
      <div>
        {!embedded && <h3 className="display">{t("f3T", lang)}</h3>}
        <p>{t("ciGlyphCap", lang)}</p>
      </div>
      <div className="feat-visual">
        <div className="line mindease in demo-msg" aria-hidden>
          <span className="demo-msg-why">{t("f3Why", lang)}</span>
          {t("f3Msg", lang)}
        </div>
        <CheckinGlyphs lang={lang} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- CTA */
export function Footer({ lang }: L) {
  return (
    <footer>
      <Reveal className="wordmark" aria-hidden>
        <div className="path" data-reveal />
        <span className="float"><PxHeart /></span><span className="float"><PxStar /></span><span className="float"><PxMoon /></span><span className="float"><PxMessage /></span>
        <div className="big" data-reveal>{"MindEase".split("").map((ch, i) => <span key={i} className="ltr" style={{ ["--i" as string]: i }}>{ch}</span>)}</div>
      </Reveal>
      <Reveal className="container">
        <div className="foot" data-stagger>
          <div>
            <div className="display" style={{ fontSize: "1.6rem" }}>MindEase</div>
            <p className="muted" style={{ maxWidth: "24rem", fontWeight: 300, lineHeight: 1.6, marginTop: 10 }}>{t("footBlurb", lang)}</p>
          </div>
          <div><p className="foot-h">{t("product", lang)}</p><a href="#why">{t("navWhy", lang)}</a><a href="#demo">{t("seeIt", lang)}</a><a href="#start">{t("navStart", lang)}</a><a href="#details">{t("navDetails", lang)}</a></div>
          <div><p className="foot-h">{t("crisisLines", lang)}</p><a href="tel:14416">Tele-MANAS 14416</a><a href="tel:+917893078930">1Life +91 78930 78930</a><a href="tel:+919999666555">Vandrevala +91 9999 666 555</a><a href="tel:112">Emergency 112</a></div>
          <div><p className="foot-h">{t("hwTitle", lang)}</p><a href="/how-it-works">{t("hwTitle", lang)}</a><a href="/help">{t("helpNow", lang)}</a><a href="https://github.com/mindease-02/mindease" target="_blank" rel="noreferrer">{t("source", lang)}</a><Link href="/login">{t("signIn", lang)}</Link></div>
        </div>
        <div className="foot-bottom" data-reveal><span>© {new Date().getFullYear()} MindEase</span><span>{t("icons", lang)}: <a href="https://lucide.dev" target="_blank" rel="noreferrer" style={{ display: "inline" }}>Lucide</a> (ISC)</span><span>{t("footNot", lang)}</span></div>
      </Reveal>
    </footer>
  );
}
