"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";
import Magnetic from "./Magnetic";
import ThemeOrb from "./ThemeOrb";

/* ---------------------------------------------------------------- Features */
const FEATURES = [
  { n: "01", t: "Reads more than words", d: "Eight emotional axes and states like loneliness, dread or relief — from what you write, and if you allow it, how you sound and type.", icon: <path d="M4 12c4-6 12-6 16 0-4 6-12 6-16 0Z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" /> },
  { n: "02", t: "Remembers you", d: "Names, plans, the story so far. Short facts you can see and delete — so a reply says “Maya”, not “a friend”.", icon: <path d="M12 3a7 7 0 0 0-7 7c0 3 2 5 3 6v3h8v-3c1-1 3-3 3-6a7 7 0 0 0-7-7Z M10 21h4" /> },
  { n: "03", t: "Checks in, carefully", d: "Mornings, isolated evenings, long silences, and real downward trends. Quiet hours, a daily cap, and it stops if you go quiet on it.", icon: <path d="M12 3v3M12 18v3M3 12h3M18 12h3 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /> },
];

function TiltCard({ f }: { f: typeof FEATURES[number] }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.MouseEvent) => {
    const el = ref.current; if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`); el.style.setProperty("--my", `${y * 100}%`);
    el.style.transform = `rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg) translateZ(6px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };
  return (
    <div ref={ref} className="card glass" onMouseMove={move} onMouseLeave={leave} data-reveal>
      <span className="num" aria-hidden>{f.n}</span>
      <div className="icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg></div>
      <div><h3>{f.t}</h3><p>{f.d}</p></div>
    </div>
  );
}

export function Features() {
  return (
    <Reveal as="section" id="features" className="block">
      <div className="container">
        <div className="sec-head">
          <div className="eyebrow" data-reveal>What it does</div>
          <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>Three things, done properly.</h2>
        </div>
        <div className="cards">{FEATURES.map((f, i) => <div key={f.n} style={{ ["--d" as string]: `${i * 110}ms` }}><TiltCard f={f} /></div>)}</div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------- Story */
export function Story() {
  return (
    <Reveal as="section" id="story" className="block">
      <div className="container story">
        <div>
          <div className="eyebrow" data-reveal>Why it exists</div>
          <blockquote className="display" data-reveal style={{ ["--d" as string]: "80ms", marginTop: 16 }}>
            A companion that is <em>always there</em> can quietly become the only one there. We built the opposite.
          </blockquote>
          <p className="body" data-reveal style={{ ["--d" as string]: "200ms", marginTop: 24 }}>
            Ori measures how much you lean on it. When that climbs, it gets shorter, says so, and points you back toward people. It is software and never pretends otherwise. It won't tell you it's waiting — it isn't running. Success is this mattering less over time.
          </p>
        </div>
        <ThemeOrb />
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------- Stats */
function Counter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(to); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now(), dur = 1600;
      const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); const k = 1 - Math.pow(1 - p, 3); setV(to * k); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      setTimeout(() => setV(to), dur + 150); // guard: rAF is paused in background tabs
    }, { threshold: 0.5 });
    io.observe(el); return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{v.toFixed(decimals)}<small>{suffix}</small></span>;
}

export function Stats() {
  const items: [number, string, string, number][] = [
    [8, "", "emotional axes tracked on every message", 0],
    [4, "", "independent detectors — two must agree before it reaches out", 0],
    [2, "/day", "maximum unprompted check-ins, never in quiet hours", 0],
    [0, "", "phone numbers ever invented — crisis lines are hard-coded", 0],
  ];
  return (
    <Reveal as="section" className="block" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="stats">
          {items.map(([n, s, l, d], i) => (
            <div className="stat" key={l} data-reveal style={{ ["--d" as string]: `${i * 90}ms` }}>
              <div className="n"><Counter to={n} suffix={s} decimals={d} /></div>
              <div className="l">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* --------------------------------------------------------------------- CTA */
export function Cta({ chatHref }: { chatHref: string }) {
  return (
    <Reveal as="section" id="start" className="block">
      <div className="container">
        <div className="cta" data-reveal>
          <div className="light" /><div className="planet" />
          <h2 className="display">Tell it how you're arriving.</h2>
          <p>Pick a mood, say a line if you want, and Ori meets you there. No account, no password — a name is enough.</p>
          <div className="ctas">
            <Magnetic href={chatHref} className="btn-primary">Start talking <span className="arrow">→</span></Magnetic>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ Footer */
export function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="foot">
          <div>
            <div className="display" style={{ fontSize: "1.6rem" }}>MindEase</div>
            <p className="muted" style={{ maxWidth: "24rem", fontWeight: 300, lineHeight: 1.6, marginTop: 10 }}>Ori is software, and says so. If you're in crisis, call a helpline — the app shows real Indian lines automatically, and never invents a number.</p>
          </div>
          <div><h5>Product</h5><a href="#features">What it does</a><a href="#story">Why</a><a href="#start">Start</a></div>
          <div><h5>Crisis lines · India</h5><a href="https://telemanas.mohfw.gov.in" target="_blank" rel="noreferrer">Tele-MANAS · 14416</a><a href="tel:18005990019">Kiran · 1800-599-0019</a><a href="https://www.vandrevalafoundation.com" target="_blank" rel="noreferrer">Vandrevala · +91 9999 666 555</a><a href="tel:112">Emergency · 112</a></div>
          <div><h5>Source</h5><a href="https://github.com/mindease-02/mindease" target="_blank" rel="noreferrer">GitHub</a><Link href="/login">Sign in</Link></div>
        </div>
        <div className="foot-bottom"><span>© {new Date().getFullYear()} MindEase</span><span>Not therapy · Not a person · Not private from you</span></div>
      </div>
    </footer>
  );
}
