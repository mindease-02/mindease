"use client";
import { useEffect, useState } from "react";
import { PxEye, PxBrain, PxBell } from "./pixelIcons";

/**
 * A one-second opening card, once per session: the orb, then three words that
 * are the whole product. Skipped under reduced motion and on return visits.
 */
const WORDS = ["noticing", "remembering", "here."];
export default function Preloader() {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("me.seen") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      sessionStorage.setItem("me.seen", "1");
    } catch { return; }
    setShow(true);
    const t1 = setTimeout(() => setI(1), 420), t2 = setTimeout(() => setI(2), 840), t3 = setTimeout(() => setShow(false), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  if (!show) return null;
  return (
    <div className="preloader" role="status" aria-label="Loading MindEase">
      <div className="pre-orb" />
      <div className="pre-word display">{WORDS[i]}</div>
      <div className="pre-icons" aria-hidden><PxEye /><PxBrain /><PxBell /></div>
    </div>
  );
}
