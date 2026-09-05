"use client";
/**
 * The Experience: a 600vh scroll story with a sticky full-viewport stage.
 * Chapters of oversized pixel type sit at the top and bottom of the frame
 * around the ball; the ball assembles from voxels on load and re-forms per
 * chapter (sphere → ring → cloud → spiral → sphere). Left/right captions carry
 * the reasoning. Everything below the Experience is the existing site.
 */
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import Magnetic from "./Magnetic";
import { PxArrow } from "./pixelIcons";
import { reduced } from "@/lib/motion";
import type { Drag, Story } from "./Scene3D";

const Scene3D = dynamic(() => import("./Scene3D"), { ssr: false, loading: () => null });

const CHAPTERS: { top: string; bottom: string; left: string; right: string; formation: number; sub?: string }[] = [
  { top: "SOMEONE WHO", bottom: "NOTICES.", left: "an ai companion", right: "not a therapist", formation: 0, sub: "Ori is an AI companion. It notices how you're doing from the way you talk, and checks in when it matters." },
  { top: "IT READS MORE", bottom: "THAN WORDS", left: "eight emotions", right: "tone · rhythm · words", formation: 2, sub: "It reads eight emotions in what you write - and, only if you allow it, your tone of voice and typing rhythm." },
  { top: "IT REMEMBERS", bottom: "YOU", left: "names · plans · past", right: "yours to forget", formation: 3, sub: "It remembers the people and plans you mention, so next week it can ask how the interview went." },
  { top: "IT CHECKS IN,", bottom: "CAREFULLY", left: "quiet hours learned", right: "two a day, at most", formation: 1, sub: "It only writes first when there's a real reason - never at night, and at most twice a day." },
  { top: "A BRIDGE, NOT", bottom: "A DESTINATION", left: "needs you less", right: "over time", formation: 0, sub: "It's built to need you less over time. The more you lean on it, the more it points you back to people." },
  { top: "TELL IT HOW", bottom: "YOU'RE ARRIVING", left: "pick a mood", right: "no password", formation: 0, sub: "Pick how you're arriving and start talking. No password needed." },
];

export default function Experience({ chatHref }: { chatHref: string }) {
  const pointer = useRef({ x: 0, y: 0 });
  const drag = useRef<Drag>({ active: false, vx: 0, vy: 0 });
  const story = useRef<Story>({ assemble: 0, formation: 0, scatter: 0 });
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"pending" | "webgl" | "webgl-lite" | "css">("pending");
  const [chapter, setChapter] = useState(0);
  const chapterRef = useRef(0);

  useEffect(() => {
    const small = window.matchMedia("(max-width: 720px)").matches;
    let webgl = false; try { const c = document.createElement("canvas"); webgl = !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { webgl = false; }
    setMode(reduced() || !webgl ? "css" : small ? "webgl-lite" : "webgl");
    // Opening assembly: the parts arrive over ~2.4s.
    const t0 = performance.now();
    let raf = 0;
    const open = () => { const p = Math.min(1, (performance.now() - t0) / 2400); story.current.assemble = reduced() ? 1 : 1 - Math.pow(1 - p, 3); if (p < 1) raf = requestAnimationFrame(open); };
    raf = requestAnimationFrame(open);
    const move = (e: PointerEvent) => { pointer.current = { x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 }; };
    window.addEventListener("pointermove", move, { passive: true });

    // Scroll → chapter + within-chapter progress; the ball scatters between chapters and re-forms.
    const onScroll = () => {
      const el = root.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
      const n = CHAPTERS.length;
      const f = p * (n - 1);
      const idx = Math.min(n - 1, Math.round(f));
      const dist = Math.abs(f - idx); // 0 at a chapter, .5 between
      story.current.scatter = reduced() ? 0 : Math.min(1, dist * 2.4);
      if (idx !== chapterRef.current) { chapterRef.current = idx; story.current.formation = CHAPTERS[idx].formation; setChapter(idx); }
    };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); window.removeEventListener("scroll", onScroll); };
  }, []);

  // Chapter text: letters slide in from the sides (top line from the left, bottom line from the right).
  useEffect(() => {
    const el = stage.current; if (!el || reduced()) return;
    const top = el.querySelectorAll(".xp-top .ch"), bottom = el.querySelectorAll(".xp-bottom .ch");
    animate(top, { translateX: [-60, 0], opacity: [0, 1], duration: 900, delay: stagger(28), ease: "outExpo" });
    animate(bottom, { translateX: [60, 0], opacity: [0, 1], duration: 900, delay: stagger(28, { from: "last" }), ease: "outExpo" });
    animate(el.querySelectorAll(".xp-side, .xp-sub, .xp-cta"), { opacity: [0, 1], translateY: [10, 0], duration: 700, delay: stagger(80, { start: 300 }), ease: "outExpo" });
  }, [chapter]);

  const onDown = (e: React.PointerEvent) => { drag.current.active = true; last.current = { x: e.clientX, y: e.clientY }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); };
  const last = useRef<{ x: number; y: number } | null>(null);
  const onMove = (e: React.PointerEvent) => { if (!drag.current.active || !last.current) return; drag.current.vx += (e.clientX - last.current.x) * 0.5; drag.current.vy += (e.clientY - last.current.y) * 0.5; last.current = { x: e.clientX, y: e.clientY }; };
  const onUp = () => { drag.current.active = false; last.current = null; };
  const c = CHAPTERS[chapter];
  const letters = (t: string) => t.split("").map((ch, i) => <span key={i} className="ch">{ch === " " ? " " : ch}</span>);

  return (
    <section ref={root} className="xp" aria-label="Experience">
      <div ref={stage} className="xp-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}>
        <div className="xp-scene">
          {(mode === "webgl" || mode === "webgl-lite") && <Scene3D pointer={pointer} drag={drag} lite={mode === "webgl-lite"} story={story} />}
          {mode === "css" && <div className="fallback-orb" aria-hidden />}
        </div>
        <div key={`t${chapter}`} className="xp-top display" aria-hidden>{letters(c.top)}</div>
        <div key={`b${chapter}`} className="xp-bottom display" aria-hidden>{letters(c.bottom)}</div>
        <h1 className="sr-only">{c.top} {c.bottom}</h1>
        <div key={`l${chapter}`} className="xp-side l">{c.left}</div>
        <div key={`r${chapter}`} className="xp-side r">{c.right}</div>
        <div key={`s${chapter}`} className="xp-sub" role="note">
          <span className="xp-sub-k">{String(chapter + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}</span>
          <span className="xp-sub-t">{c.sub}</span>
          {chapter === CHAPTERS.length - 1 && <span className="xp-cta"><Magnetic href={chatHref} className="btn-primary">Start talking <PxArrow className="pxicon" /></Magnetic></span>}
        </div>
        <div className="xp-dots" aria-hidden>{CHAPTERS.map((_, i) => <i key={i} className={i === chapter ? "on" : ""} />)}</div>
        <div className="xp-hint" aria-hidden>{chapter < CHAPTERS.length - 1 ? "scroll" : ""}</div>
      </div>
    </section>
  );
}
