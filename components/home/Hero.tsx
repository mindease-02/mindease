"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Magnetic from "./Magnetic";
import { Words } from "./Reveal";
import { heroTimeline } from "@/lib/motion";
import { PxArrow } from "./pixelIcons";

import type { Drag } from "./Scene3D";
const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false, loading: () => null });

const CARDS = [
  { k: "read", t: <><b>loneliness</b> <span className="v">62%</span> · need: company</>, style: { left: "2%", top: "16%", "--fd": "0s", "--rot": "-4deg" }, keep: true },
  { k: "remembered", t: <>Maya · sister · fell out in <b>March</b></>, style: { right: "0%", top: "26%", "--fd": "1.3s", "--rot": "3deg" } },
  { k: "check-in", t: <>quiet hours · <b>22:30 → 08:00</b> · budget 1/2</>, style: { left: "6%", bottom: "14%", "--fd": "2.4s", "--rot": "2deg" } },
  { k: "mismatch", t: <>words <b>fine</b> · voice <span className="v">flat</span> · asking, not assuming</>, style: { right: "4%", bottom: "8%", "--fd": "0.7s", "--rot": "-3deg" } },
];

export default function Hero({ chatHref }: { chatHref: string }) {
  const pointer = useRef({ x: 0, y: 0 });
  const drag = useRef<Drag>({ active: false, vx: 0, vy: 0 });
  const last = useRef<{ x: number; y: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "webgl" | "webgl-lite" | "css">("pending");
  const [ready, setReady] = useState(false);
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 720px)").matches;
    let webgl = false;
    try { const c = document.createElement("canvas"); webgl = !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { webgl = false; }
    // Phones get the real scene too, in a lighter configuration; the CSS orb is
    // only for reduced-motion or missing WebGL.
    setMode(!webgl ? "css" : small ? "webgl-lite" : "webgl");
    const t = setTimeout(() => {
      setReady(true);
      const root = section.current; if (!root) return;
      heroTimeline({
        eyebrow: root.querySelector(".sticker"), words: root.querySelectorAll("h1 .word > span"), lede: root.querySelector(".lede"), ctas: root.querySelector(".ctas"),
        stage: root.querySelector(".stage"), cards: root.querySelectorAll(".float-card"),
      });
    }, 60);
    const move = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 };
      if (stage.current && !reduced) {
        stage.current.style.setProperty("--px", String(pointer.current.x));
        stage.current.style.setProperty("--py", String(pointer.current.y));
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    // Camera pull on scroll: the stage recedes and the copy drifts up, at different rates.
    const sec = stage.current?.closest(".hero") as HTMLElement | null;
    const onScroll = () => {
      if (!sec || reduced) return;
      const y = Math.min(window.scrollY, window.innerHeight);
      sec.style.setProperty("--sc", String(y / window.innerHeight));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("pointermove", move); window.removeEventListener("scroll", onScroll); };
  }, []);

  // Touch or mouse drag on the stage spins the sphere; vertical page scroll still works (touch-action: pan-y).
  const onDown = (e: React.PointerEvent) => { drag.current.active = true; last.current = { x: e.clientX, y: e.clientY }; stage.current?.classList.add("dragging"); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.active || !last.current) return;
    drag.current.vx += (e.clientX - last.current.x) * 0.5; drag.current.vy += (e.clientY - last.current.y) * 0.5;
    last.current = { x: e.clientX, y: e.clientY };
    if (e.pointerType === "touch") pointer.current = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 };
  };
  const onUp = () => { drag.current.active = false; last.current = null; stage.current?.classList.remove("dragging"); };

  return (
    <section ref={section} className={`hero anime ${ready ? "in" : ""}`} aria-labelledby="hero-title">
      <div className="rays" aria-hidden />
      <div className="container hero-grid">
        <div className="copy">
          <div className="sticker" data-reveal style={{ ["--d" as string]: "0ms" }}>An AI companion · not a therapist · says so</div>
          <h1 id="hero-title" className="display">
            <Words text="Someone who" start={80} /> <br />
            <em><Words text="notices." start={260} /></em>
          </h1>
          <p className="lede" data-reveal style={{ ["--d" as string]: "420ms" }}>
            Ori pays attention to how you're doing — what you say, how you say it, and how that changes over days — and checks in when it matters. It remembers you. It's warm. And it's built to need you less over time.
          </p>
          <div className="ctas" data-reveal style={{ ["--d" as string]: "560ms" }}>
            <Magnetic href={chatHref} className="btn-primary">Start talking <PxArrow className="pxicon" /></Magnetic>
            <Magnetic href="#story">Why it exists</Magnetic>
          </div>
        </div>

        <div ref={stage} className="stage" data-reveal style={{ ["--d" as string]: "200ms" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}>
          {(mode === "webgl" || mode === "webgl-lite") && <Scene3D pointer={pointer} drag={drag} lite={mode === "webgl-lite"} />}
          {mode === "css" && <div className="fallback-orb" aria-hidden />}
          <div className="flare" aria-hidden><i /><b /></div>
          <div className="particles" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <i key={i} style={{ left: `${(i * 53) % 100}%`, top: `${20 + ((i * 37) % 70)}%`, ["--t" as string]: `${10 + (i % 5) * 3}s`, ["--fd" as string]: `${(i % 7) * 1.1}s` }} />
            ))}
          </div>
          {CARDS.map((c) => (
            <div key={c.k} className={`float-card glass ${c.keep ? "keep" : ""}`} data-rot={String(c.style["--rot"]).replace("deg", "")} style={c.style as React.CSSProperties}>
              <span className="k">{c.k}</span>{c.t}
            </div>
          ))}
          <div className="flank l" aria-label="How it reads">
            <span><b>8</b>emotional axes</span><span><b>4</b>detectors, two must agree</span><span><b>2</b>check-ins a day, at most</span>
          </div>
          <div className="flank r" aria-label="What it never does">
            <span><b>0</b>numbers invented</span><span><b>zzz</b>quiet hours, learned</span><span><b>IN</b>helplines by default</span>
          </div>
        </div>
      </div>
      <div className="scroll-hint" aria-hidden>scroll</div>
    </section>
  );
}
