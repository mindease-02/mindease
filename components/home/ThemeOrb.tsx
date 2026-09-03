"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { applyPalette, currentPalette, nextPalette, PALETTES, type Palette } from "@/lib/theme";

const Sphere3D = dynamic(() => import("./Sphere3D"), { ssr: false, loading: () => null });

/**
 * The ball in "why it exists". Tap it to see the emotions: each one has an
 * assigned colour, the ball takes that colour, and so does the whole site.
 */
export default function ThemeOrb() {
  const [p, setP] = useState<Palette>(PALETTES[0]);
  const [webgl, setWebgl] = useState(true);
  const tap = useRef(0);
  useEffect(() => {
    setP(currentPalette());
    try { const c = document.createElement("canvas"); setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl"))); } catch { setWebgl(false); }
  }, []);
  const cycle = () => { const n = nextPalette(p); setP(n); applyPalette(n); tap.current++; };

  return (
    <div className="frame glass theme-frame" data-reveal style={{ ["--d" as string]: "160ms" }}>
      <div className="glow" />
      <button type="button" className="char-btn" onClick={cycle} aria-label={`Tap to see the next emotion (now: ${p.label})`}>
        {webgl ? <Sphere3D tapSignal={tap} /> : <span className="orb fallback-face" />}
      </button>
      <div className="label">
        <span className="eyebrow">Tap the ball to see the moods</span>
        <b key={p.id} className="emotion display">{p.label}</b>
        <span key={p.id + "d"} className="hint">{p.description}</span>
      </div>
      <div className="swatches" aria-hidden>
        {PALETTES.map((x) => <i key={x.id} className={x.id === p.id ? "on" : ""} style={{ background: x.accent }} title={x.label} />)}
      </div>
    </div>
  );
}
