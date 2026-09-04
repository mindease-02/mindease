"use client";
import { useEffect } from "react";

/** The tab title narrates the scroll: "MindEase · noticing" → "· remembering" → "· checking in" → "· why". */
export default function ScrollTitle() {
  useEffect(() => {
    const base = "MindEase";
    const map: [string, string][] = [["#story", "why"], ["#features", "what it does"], ["#demo", "a conversation"], [".hero", "noticing"]];
    const els = map.map(([sel, t]) => [document.querySelector<HTMLElement>(sel), t] as const).filter(([e]) => e) as [HTMLElement, string][];
    let raf = 0;
    const f = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      const mid = window.innerHeight / 2;
      const hit = els.find(([e]) => { const r = e.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
      document.title = hit ? `${base} · ${hit[1]}` : `${base} - Ori, a companion that notices`;
    }); };
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => { window.removeEventListener("scroll", f); cancelAnimationFrame(raf); document.title = `${base} - Ori, a companion that notices`; };
  }, []);
  return null;
}
