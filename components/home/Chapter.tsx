"use client";
import { useEffect, useRef } from "react";

/**
 * A pinned chapter of the landing film. The section is tall; its stage sticks
 * to the viewport while the scroll position scrubs through the chapter's
 * beats. A beat is any child with data-beat, plus data-in / data-out (0..1 of
 * the chapter) and, if it wants the particle field to make room, data-fx,
 * data-fy (world-unit nudges) and data-dim (0..1). Beats fade and drift as
 * the reader passes them; the strongest beat's nudges go to the scene as a
 * "me:chapter" event. With reduced motion the chapter is a plain section and
 * every beat is visible.
 */
const clamp = (v: number) => Math.min(1, Math.max(0, v));

export default function Chapter({ id, length = 2.6, className = "", label, children }: { id: string; length?: number; className?: string; label?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 720px)").matches;
    if (reduced) { el.classList.add("still"); return; }
    const beats = Array.from(el.querySelectorAll<HTMLElement>("[data-beat]"));
    let raf = 0, lastKey = "";
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const span = Math.max(1, r.height - vh);
      const p = clamp(-r.top / span);
      el.style.setProperty("--p", p.toFixed(4));
      const onStage = r.top < vh * 0.5 && r.bottom > vh * 0.5;
      if (onStage) document.documentElement.dataset.ch = id;
      // Jumped straight past this chapter (an anchor link, a restored scroll position): give the stage up.
      else if (document.documentElement.dataset.ch === id) document.documentElement.dataset.ch = r.bottom <= vh * 0.5 ? "past" : "before";
      let top: HTMLElement | null = null, topK = 0;
      for (const b of beats) {
        const a = parseFloat(b.dataset.in ?? "0"), z = parseFloat(b.dataset.out ?? "1"), f = parseFloat(b.dataset.fade ?? "0.1");
        const kin = a <= 0 ? 1 : clamp((p - a) / f);
        const kout = z >= 1 ? 1 : 1 - clamp((p - (z - f)) / f);
        const k = Math.min(kin, kout), leaving = kout < kin;
        if (k > topK) { topK = k; top = b; }
        const y = (1 - k) * (leaving ? -36 : 36);
        b.style.opacity = k.toFixed(3);
        b.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
        b.style.filter = phone || k > 0.97 ? "" : `blur(${((1 - k) * 6).toFixed(1)}px)`;
        b.style.pointerEvents = k > 0.6 ? "" : "none";
      }
      // Tell the scene what the strongest beat wants: a nudge and a dim.
      if (onStage) {
        const fx = parseFloat(top?.dataset.fx ?? "0"), fy = parseFloat(top?.dataset.fy ?? "0"), dim = parseFloat(top?.dataset.dim ?? "1");
        const key = `${id}:${fx}:${fy}:${dim}`;
        if (key !== lastKey) { lastKey = key; window.dispatchEvent(new CustomEvent("me:chapter", { detail: { id, fx, fy, dim } })); }
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    // Keyboard and screen-reader users reach every beat in order: focus inside a beat scrolls the chapter to it.
    const onFocus = (e: FocusEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>("[data-beat]"); if (!b) return;
      const a = parseFloat(b.dataset.in ?? "0"), z = parseFloat(b.dataset.out ?? "1");
      const r = el.getBoundingClientRect(), span = Math.max(1, r.height - window.innerHeight);
      const p = clamp(-r.top / span);
      if (p >= a && p <= z) return;
      window.scrollTo({ top: r.top + window.scrollY + span * Math.min(z - 0.02, a + 0.12), behavior: "instant" });
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    el.addEventListener("focusin", onFocus);
    const settle = setTimeout(update, 700);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); el.removeEventListener("focusin", onFocus); cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [id]);
  return (
    <section ref={ref} id={id} className={`ch ${className}`} style={{ ["--len" as string]: length }} aria-label={label}>
      <div className="stage">
        <div className="scrim" aria-hidden />
        {children}
      </div>
    </section>
  );
}
