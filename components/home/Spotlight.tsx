"use client";
import { useEffect } from "react";

/** A soft light that follows the pointer across the details rows; nothing on touch screens. */
export default function Spotlight() {
  useEffect(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".details .dt"));
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      for (const r of rows) { const b = r.getBoundingClientRect(); r.style.setProperty("--mx", `${e.clientX - b.left}px`); r.style.setProperty("--my", `${e.clientY - b.top}px`); }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return null;
}
