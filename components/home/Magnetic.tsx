"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { bindLift, bindMagnetic } from "@/lib/motion";

/** A button that leans toward the cursor, springs back, and squashes on press (Anime.js). */
export default function Magnetic({ href, children, className = "", onClick }: { href?: string; children: React.ReactNode; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const a = bindMagnetic(el, 10), b = bindLift(el, { lift: -2, scale: 1.02 });
    return () => { a(); b(); };
  }, []);
  const cls = `btn ${className}`;
  if (href) return <Link ref={ref as React.RefObject<HTMLAnchorElement>} href={href} className={cls}>{children}</Link>;
  return <button ref={ref as React.RefObject<HTMLButtonElement>} type="button" className={cls} onClick={onClick}>{children}</button>;
}
