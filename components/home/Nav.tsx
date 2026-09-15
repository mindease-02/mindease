"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import LanguageSwitch from "../LanguageSwitch";
import TrustStrip from "../TrustStrip";
import { PxMenu, PxRemove, PxArrow } from "./pixelIcons";
import { t } from "@/lib/i18n";

export default function Nav({ chatHref, signedIn, name, lang }: { chatHref: string; signedIn: boolean; name?: string; lang: string }) {
  const LINKS: [string, string][] = [["#why", t("navWhy", lang)], ["#demo", t("seeIt", lang)], ["#start", t("navStart", lang)], ["#details", t("navDetails", lang)]];
  async function signOut() { await fetch("/api/auth/logout", { method: "POST" }).catch(() => {}); window.location.href = "/login"; }
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f(); window.addEventListener("scroll", f, { passive: true });
    const secs = LINKS.map(([h]) => document.querySelector<HTMLElement>(h)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActive("#" + e.target.id); }, { rootMargin: "-40% 0px -55% 0px" });
    secs.forEach((el) => io.observe(el));
    return () => { window.removeEventListener("scroll", f); io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  const cta = signedIn ? (name ? t("chatAs", lang, { name }) : t("openChat", lang)) : t("talkTo", lang);

  return (
    <>
      <header className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-inner">
          <Link href="/" className="flex items-center gap-3 no-underline" style={{ color: "var(--ink)" }} aria-label={t("home", lang)}>
            <span className="block h-7 w-7 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #fff, rgba(255,255,255,0) 40%), linear-gradient(145deg, var(--coral-2), var(--accent-mid) 60%, var(--accent-deep))" }} aria-hidden />
            <span className="display" style={{ fontSize: ".95rem" }}>MindEase</span>
          </Link>
          <nav className="rail" aria-label="Sections">
            {LINKS.map(([h, l], i) => { const idx = LINKS.findIndex(([x]) => x === active); return <a key={h} href={h} aria-current={active === h ? "true" : undefined} className={active === h ? "on" : idx > i ? "done" : ""} aria-label={l}><i aria-hidden /><span>{l}</span></a>; })}
          </nav>
          <div className="nav-cta">
            <LanguageSwitch lang={lang} signedIn={signedIn} compact />
            {signedIn && <button type="button" className="linkish nav-signout" onClick={signOut} title={name ? t("signedInAs", lang, { name }) : undefined}>{t("signOut", lang)}</button>}
            <Link href={chatHref} className="btn btn-primary">{cta} <PxArrow className="pxicon" /></Link>
            <button className="burger" aria-label={open ? t("closeMenu", lang) : t("openMenu", lang)} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? <PxRemove className="pxicon" style={{ fontSize: 20 }} /> : <PxMenu className="pxicon" style={{ fontSize: 20 }} />}
            </button>
          </div>
        </div>
        <TrustStrip lang={lang} className="in-nav" />
      </header>
      {open && (
        <div className="mobile-menu glass" role="dialog" aria-label="Menu">
          {LINKS.map(([h, l]) => <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>)}
          <div style={{ padding: "6px 16px" }}><LanguageSwitch lang={lang} signedIn={signedIn} /></div>
          <Link href={chatHref} className="btn btn-primary" style={{ justifyContent: "center", marginTop: 6 }} onClick={() => setOpen(false)}>{cta} <PxArrow className="pxicon" /></Link>
          {signedIn && <button type="button" className="btn" style={{ justifyContent: "center" }} onClick={signOut}>{t("signOut", lang)}</button>}
        </div>
      )}
    </>
  );
}
