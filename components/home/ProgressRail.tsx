"use client";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { tx } from "@/lib/i18n/tx";

/**
 * The left progress rail of the landing film, on screens 1024px and wider.
 * A thin track fills from the top as the reader moves from the top of #why
 * to the top of #details; each chapter's label sits at that chapter's share
 * of the way, so the fill reaches a dot exactly as its chapter takes the
 * stage. The current chapter is bright, passed chapters are quieter. Below
 * 1024px nothing is rendered: the header's own rail does the job there.
 */
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const IDS = ["why", "demo", "start", "details"] as const;

export default function ProgressRail({ lang }: { lang: string }) {
  const labels = [t("navWhy", lang), t("seeIt", lang), t("navStart", lang), t("navDetails", lang)];
  const ref = useRef<HTMLElement>(null);
  const [wide, setWide] = useState(false);
  const [at, setAt] = useState<number[]>([0, 1 / 3, 2 / 3, 1]);
  const [current, setCurrent] = useState(-1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setWide(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!wide) return;
    const el = ref.current; if (!el) return;
    let raf = 0, tops: number[] = [], lastAt = "", lastCur = -2;
    const measure = () => {
      tops = IDS.map((id) => { const s = document.getElementById(id); return s ? s.getBoundingClientRect().top + window.scrollY : NaN; });
      const a = tops[0], b = tops[3], span = Math.max(1, b - a);
      const next = tops.map((top) => clamp((top - a) / span));
      const key = next.map((n) => n.toFixed(3)).join(",");
      if (key !== lastAt) { lastAt = key; setAt(next); }
    };
    const update = () => {
      raf = 0;
      if (tops.length !== 4 || tops.some((v) => Number.isNaN(v))) measure();
      const y = window.scrollY, vh = window.innerHeight;
      const a = tops[0], b = tops[3];
      el.style.setProperty("--pr", clamp((y - a) / Math.max(1, b - a)).toFixed(4));
      // The current chapter is the last one whose top has passed the upper part
      // of the viewport, the same band the header's rail watches.
      const probe = y + vh * 0.42;
      let cur = -1;
      tops.forEach((top, i) => { if (probe >= top) cur = i; });
      if (cur !== lastCur) { lastCur = cur; setCurrent(cur); }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onResize = () => { measure(); onScroll(); };
    measure(); update();
    // Layout settles after fonts and the scene arrive; measure once more then.
    const settle = window.setTimeout(onResize, 900);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [wide]);

  if (!wide) return null;
  return (
    <nav ref={ref} className="prail" aria-label={tx("railLabel", lang, "Progress through the page")}>
      <span className="prail-track" aria-hidden><i className="prail-fill" /></span>
      <ol>
        {IDS.map((id, i) => (
          <li key={id} style={{ ["--at" as string]: at[i] }}>
            <a href={`#${id}`} className={i === current ? "on" : i < current ? "done" : ""} aria-current={i === current ? "true" : undefined}>{labels[i]}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
