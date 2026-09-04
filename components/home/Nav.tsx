"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Magnetic from "./Magnetic";

const LINKS = [["#demo", "See it"], ["#features", "What it does"], ["#story", "Why"], ["#start", "Start"]];

export default function Nav({ chatHref, signedIn }: { chatHref: string; signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f(); window.addEventListener("scroll", f, { passive: true });
    // Scroll-spy: mark the section in view so the nav shows where you are.
    const secs = LINKS.map(([h]) => document.querySelector<HTMLElement>(h)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActive("#" + e.target.id); }, { rootMargin: "-40% 0px -55% 0px" });
    secs.forEach((el) => io.observe(el));
    return () => { window.removeEventListener("scroll", f); io.disconnect(); };
  }, []);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);

  return (
    <>
      <header className={`nav ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-inner">
          <Link href="/" className="flex items-center gap-3 no-underline" style={{ color: "var(--ink)" }} aria-label="MindEase home">
            <span className="block h-7 w-7 rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #fff, rgba(255,255,255,0) 40%), linear-gradient(145deg,#ffb59a,#ef7a5a 60%,#6d2a1f)", boxShadow: "0 8px 20px -6px rgba(240,135,106,.7)" }} />
            <span className="display" style={{ fontSize: "1.35rem", letterSpacing: "-0.01em" }}>MindEase</span>
          </Link>
          <nav className="nav-links glass" aria-label="Primary">
            {LINKS.map(([h, l]) => <a key={h} href={h} aria-current={active === h ? "true" : undefined}>{l}</a>)}
          </nav>
          <div className="nav-cta">
            <Magnetic href={chatHref} className="btn-primary" >{signedIn ? "Open chat" : "Talk to Ori"} <span className="arrow">→</span></Magnetic>
            <button className="burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">{open ? <path d="M3 3l12 12M15 3L3 15" /> : <path d="M2 5h14M2 9h14M2 13h14" />}</svg>
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="mobile-menu glass" role="dialog" aria-label="Menu">
          {LINKS.map(([h, l]) => <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>)}
          <Link href={chatHref} className="btn btn-primary" style={{ justifyContent: "center", marginTop: 6 }} onClick={() => setOpen(false)}>{signedIn ? "Open chat" : "Talk to Ori"}</Link>
        </div>
      )}
    </>
  );
}
