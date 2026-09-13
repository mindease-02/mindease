"use client";
import { useEffect, useState } from "react";
import { PxArrow } from "./pixelIcons";

/** On phones the nav's call to action is hidden behind the menu; this pill keeps it one thumb away. */
export default function MobileCta({ href, label = "Start talking" }: { href: string; label?: string }) {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const end = document.querySelector("#start"); const top = document.querySelector(".title-card");
    if (!end || !("IntersectionObserver" in window)) return;
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver((es) => { es.forEach((e) => seen.set(e.target, e.isIntersecting)); setOff([...seen.values()].some(Boolean)); }, { threshold: 0.2 });
    io.observe(end); if (top) io.observe(top);
    return () => io.disconnect();
  }, []);
  return <a href={href} className={`mobile-cta btn-primary ${off ? "off" : ""}`} aria-hidden={off}>{label} <PxArrow className="pxicon" /></a>;
}
