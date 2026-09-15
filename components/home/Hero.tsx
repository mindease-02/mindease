"use client";
import { useEffect, useRef } from "react";
import { t } from "@/lib/i18n";
import { bindMagnetic, reduced } from "@/lib/motion";
import { PxArrow, PxCheck, PxShield, PxStar } from "./pixelIcons";
import Reveal, { Words } from "./Reveal";
import Chapter from "./Chapter";
import HeroLoop from "./HeroLoop";

/**
 * The title card. The particle wheel forms centre stage while the headline
 * rises word by word in the lower third, film-title style. The accent word
 * breathes, the headline block drifts a few pixels with the pointer on
 * desktop, and a small example card types beside it. It stays pinned while
 * the wheel turns into the two ribbons of the next chapter.
 */
const PILL_ICONS = [PxCheck, PxShield, PxStar, PxCheck];

export default function Hero({ chatHref, lang }: { chatHref: string; lang: string }) {
  const block = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = block.current, btn = primary.current;
    if (!el || !btn) return;
    if (!window.matchMedia("(pointer: fine)").matches || reduced()) return;
    // A few pixels of parallax on the headline block, eased toward the pointer. Desktop only; the wheel has its own tilt.
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: MouseEvent) => {
      const ch = document.documentElement.dataset.ch; if (ch && ch !== "top") return;
      tx = (e.clientX / window.innerWidth - 0.5) * -10; ty = (e.clientY / window.innerHeight - 0.5) * -6;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const leave = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseleave", leave);
    const unMagnet = bindMagnetic(btn, 8);
    return () => { window.removeEventListener("mousemove", move); document.removeEventListener("mouseleave", leave); cancelAnimationFrame(raf); unMagnet(); el.style.transform = ""; };
  }, []);

  // "Free. No ads. No paid tier. Nothing to unlock." as pills; the break works for all six scripts.
  const pills = t("priceLine", lang).split(/[.।]\s*/).map((s) => s.trim()).filter(Boolean).slice(0, 4);

  return (
    <Chapter id="top" length={1.5} className="ch-hero" label={t("home", lang)}>
      <div data-beat data-in="0" data-out="1" className="beat beat-title">
        <Reveal className="container hero-grid">
          <div className="hero-inner">
            <div ref={block} className="hero-para">
              <p className="tc-eyebrow" data-reveal>Parneeth × Team Archangels</p>
              <h1 className="display hero-title" data-reveal style={{ ["--d" as string]: "120ms" }}><Words text={t("xp1Top", lang)} step={70} /> <span className="hero-accent"><Words text={t("xp1Bottom", lang)} start={260} step={70} /></span></h1>
              <p className="hero-sub" data-reveal style={{ ["--d" as string]: "420ms" }}>{t("xp1Sub", lang)}</p>
              <div className="hero-ctas" data-reveal style={{ ["--d" as string]: "560ms" }}>
                <a ref={primary} href={chatHref} className="btn btn-primary btn-halo btn-magnet">{t("startTalking", lang)} <PxArrow className="pxicon" /></a>
                <a href="#demo" className="btn btn-ghost">{t("seeIt", lang)}</a>
              </div>
              <ul className="hero-pills" tabIndex={0} aria-label={t("priceLine", lang)} data-reveal style={{ ["--d" as string]: "660ms" }}>
                {pills.map((p, i) => { const Icon = PILL_ICONS[i % PILL_ICONS.length]; return <li key={p} className="pill"><Icon className="pxicon" />{p}</li>; })}
              </ul>
              <p className="hero-note" data-reveal style={{ ["--d" as string]: "760ms" }}>{t("footNot", lang)}</p>
            </div>
          </div>
          <HeroLoop lang={lang} />
        </Reveal>
      </div>
      <a href="#why" className="scroll-hint" aria-label={t("navWhy", lang)}><i /><i /></a>
    </Chapter>
  );
}
