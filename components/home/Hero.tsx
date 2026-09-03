"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Magnetic from "./Magnetic";
import { Words } from "./Reveal";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false, loading: () => null });

const CARDS = [
  { k: "read", t: <><b>loneliness</b> <span className="v">62%</span> · need: company</>, style: { left: "2%", top: "16%", "--fd": "0s" }, keep: true },
  { k: "remembered", t: <>Maya · sister · fell out in <b>March</b></>, style: { right: "0%", top: "26%", "--fd": "1.3s" } },
  { k: "check-in", t: <>quiet hours · <b>22:30 → 08:00</b> · budget 1/2</>, style: { left: "6%", bottom: "14%", "--fd": "2.4s" } },
  { k: "mismatch", t: <>words <b>fine</b> · voice <span className="v">flat</span> · asking, not assuming</>, style: { right: "4%", bottom: "8%", "--fd": "0.7s" } },
];

export default function Hero({ chatHref }: { chatHref: string }) {
  const pointer = useRef({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "webgl" | "css">("pending");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 720px)").matches;
    let webgl = false;
    try { const c = document.createElement("canvas"); webgl = !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { webgl = false; }
    setMode(!reduced && !small && webgl ? "webgl" : "css");
    const t = setTimeout(() => setReady(true), 60);
    const move = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 };
      if (stage.current && !reduced) {
        stage.current.style.setProperty("--px", String(pointer.current.x));
        stage.current.style.setProperty("--py", String(pointer.current.y));
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("pointermove", move); };
  }, []);

  return (
    <section className={`hero ${ready ? "in" : ""}`} aria-labelledby="hero-title">
      <div className="container hero-grid">
        <div>
          <div className="eyebrow" data-reveal style={{ ["--d" as string]: "0ms" }}>An AI companion · not a therapist · says so</div>
          <h1 id="hero-title" className="display">
            <Words text="Someone who" start={80} /> <br />
            <em><Words text="notices." start={260} /></em>
          </h1>
          <p className="lede" data-reveal style={{ ["--d" as string]: "420ms" }}>
            Ori pays attention to how you're doing — what you say, how you say it, and how that changes over days — and checks in when it matters. It remembers you. It's warm. And it's built to need you less over time.
          </p>
          <div className="ctas" data-reveal style={{ ["--d" as string]: "560ms" }}>
            <Magnetic href={chatHref} className="btn-primary">Start talking <span className="arrow">→</span></Magnetic>
            <Magnetic href="#showcase">See how it thinks</Magnetic>
          </div>
        </div>

        <div ref={stage} className="stage" data-reveal style={{ ["--d" as string]: "200ms" }}>
          {mode === "webgl" && <Scene3D pointer={pointer} />}
          {mode === "css" && <div className="fallback-orb" aria-hidden />}
          <div className="particles" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <i key={i} style={{ left: `${(i * 53) % 100}%`, top: `${20 + ((i * 37) % 70)}%`, ["--t" as string]: `${10 + (i % 5) * 3}s`, ["--fd" as string]: `${(i % 7) * 1.1}s` }} />
            ))}
          </div>
          {CARDS.map((c) => (
            <div key={c.k} className={`float-card glass ${c.keep ? "keep" : ""}`}
              style={{ ...(c.style as React.CSSProperties), transform: `translate3d(calc(var(--px, 0) * -14px), calc(var(--py, 0) * -10px), 0)` }}>
              <span className="k">{c.k}</span>{c.t}
            </div>
          ))}
        </div>
      </div>
      <div className="scroll-hint" aria-hidden>scroll</div>
    </section>
  );
}
