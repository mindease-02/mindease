"use client";
import { useEffect, useState } from "react";
import { applyPalette, currentPalette, nextPalette, PALETTES, type Palette } from "@/lib/theme";

/**
 * The orb in "why it exists". Tap it and it changes colour - and so does the
 * whole site. A small, honest bit of agency: the place looks how you set it.
 */
export default function ThemeOrb() {
  const [p, setP] = useState<Palette>(PALETTES[0]);
  useEffect(() => { setP(currentPalette()); }, []);
  const cycle = () => { const n = nextPalette(p); setP(n); applyPalette(n); };
  return (
    <div className="frame glass theme-frame" data-reveal style={{ ["--d" as string]: "160ms" }}>
      <div className="glow" />
      <button type="button" className="orb-btn" onClick={cycle} aria-label={`Change the site colour (currently ${p.label})`}>
        <span className="orb" /><span className="ring" />
      </button>
      <div className="reflect" />
      <div className="label">tap the orb · {p.label.toLowerCase()} · it changes the whole place</div>
      <div className="swatches" aria-hidden>
        {PALETTES.map((x) => <i key={x.id} className={x.id === p.id ? "on" : ""} style={{ background: x.accent }} />)}
      </div>
    </div>
  );
}
