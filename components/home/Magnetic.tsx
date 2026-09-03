"use client";
import Link from "next/link";
import { useRef } from "react";

/** A button that leans toward the cursor and springs back. Inert under reduced motion. */
export default function Magnetic({ href, children, className = "", onClick }: { href?: string; children: React.ReactNode; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const move = (e: React.MouseEvent) => {
    const el = ref.current; if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / r.width, y = (e.clientY - (r.top + r.height / 2)) / r.height;
    el.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ""; };
  const cls = `btn ${className}`;
  if (href) return <Link ref={ref as React.RefObject<HTMLAnchorElement>} href={href} className={cls} onMouseMove={move} onMouseLeave={leave}>{children}</Link>;
  return <button ref={ref as React.RefObject<HTMLButtonElement>} type="button" className={cls} onMouseMove={move} onMouseLeave={leave} onClick={onClick}>{children}</button>;
}
