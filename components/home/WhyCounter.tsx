"use client";
import { useEffect, useRef } from "react";
import { t } from "@/lib/i18n";

/**
 * A small glass pill at the top right of the why chapter's stage, reading
 * "Check-ins 100%" and counting down 100 → 80 → 50 → 25 as the chapter's
 * four beats pass. Progress is read from #why's rect exactly as Chapter reads
 * it; the thresholds match the beats' data-in values. Decorative: hidden from
 * assistive tech, the chapter's sr-only line carries the meaning. With
 * reduced motion the number jumps instead of tweening.
 */
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const valueAt = (p: number) => (p < 0.24 ? 100 : p < 0.46 ? 80 : p < 0.7 ? 50 : 25);

export default function WhyCounter({ lang }: { lang: string }) {
  const num = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = num.current, why = document.getElementById("why");
    if (!el || !why) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let shown = 100, target = 100, from = 100, t0 = 0, raf = 0, tween = 0;
    const paint = (v: number) => { shown = v; el.textContent = String(Math.round(v)); };
    const step = (now: number) => {
      const k = clamp((now - t0) / 700), e = 1 - Math.pow(1 - k, 3);
      paint(from + (target - from) * e);
      tween = k < 1 ? requestAnimationFrame(step) : 0;
    };
    const update = () => {
      raf = 0;
      const r = why.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      const v = valueAt(p);
      if (v === target) return;
      target = v;
      if (reduced) { paint(v); return; }
      from = shown; t0 = performance.now();
      if (!tween) tween = requestAnimationFrame(step);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); cancelAnimationFrame(tween); };
  }, []);
  return (
    <div className="why-counter" aria-live="off" aria-hidden>
      <span>{t("ciTitle", lang)}</span>
      <b><span ref={num}>100</span><small>%</small></b>
    </div>
  );
}
