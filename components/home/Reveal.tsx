"use client";
import { useEffect, useRef } from "react";
import { revealIn, wordsIn } from "@/lib/motion";

/** Adds `in` to [data-reveal] descendants (and itself) when they enter the viewport. */
export default function Reveal({ children, as: Tag = "div", className = "", ...rest }: { children: React.ReactNode; as?: keyof React.JSX.IntrinsicElements; className?: string } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // Children of [data-stagger] become reveal targets with rising delays.
    root.querySelectorAll<HTMLElement>("[data-stagger]").forEach((g) => Array.from(g.children).forEach((c, i) => { const el = c as HTMLElement; if (!el.hasAttribute("data-reveal")) { el.setAttribute("data-reveal", ""); el.style.setProperty("--d", `${i * 90}ms`); } }));
    const targets = [root, ...Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))].filter((n) => n.hasAttribute("data-reveal"));
    if (!targets.length) return;
    // Anything already on screen reveals at once - no dependence on the observer
    // firing (it does not in background tabs), staggered by each element's --d.
    const show = (t: HTMLElement) => {
      if (t.classList.contains("in")) return;
      t.classList.add("in");
      const delay = parseFloat(t.style.getPropertyValue("--d")) || 0;
      revealIn(t, { delay });
      const words = t.querySelectorAll(".word > span");
      if (words.length) wordsIn(words, delay + 80);
    };
    const vh = window.innerHeight;
    for (const t of targets) { if (t.getBoundingClientRect().top < vh * 0.95) show(t); }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { show(e.target as HTMLElement); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    targets.filter((t) => !t.classList.contains("in")).forEach((t) => io.observe(t));
    // Belt and braces for browsers that throttle observers (older mobile Safari,
    // low-power mode): a scroll listener reveals anything that has entered view.
    const onScroll = () => { for (const t of targets) if (!t.classList.contains("in") && t.getBoundingClientRect().top < window.innerHeight * 0.92) show(t); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);
  const T = Tag as unknown as React.ElementType;
  return <T ref={ref} className={className} {...rest}>{children}</T>;
}

/** Splits a headline into words that slide up in sequence. */
export function Words({ text, start = 0, step = 60 }: { text: string; start?: number; step?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="word" style={{ ["--d" as string]: `${start + i * step}ms` }}><span>{w}</span>{i < text.split(" ").length - 1 ? " " : ""}</span>
      ))}
    </>
  );
}
