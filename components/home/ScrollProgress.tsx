"use client";
import { useEffect, useState } from "react";

/** A thin accent line along the top that fills as you scroll - the film's timeline. */
export default function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const f = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const h = document.documentElement; setP(h.scrollHeight > h.clientHeight ? h.scrollTop / (h.scrollHeight - h.clientHeight) : 0); }); };
    f(); window.addEventListener("scroll", f, { passive: true }); window.addEventListener("resize", f);
    return () => { window.removeEventListener("scroll", f); window.removeEventListener("resize", f); cancelAnimationFrame(raf); };
  }, []);
  return <div className="progress" aria-hidden style={{ transform: `scaleX(${p})` }} />;
}
