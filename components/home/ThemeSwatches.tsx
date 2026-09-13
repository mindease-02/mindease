"use client";
import { useEffect, useState } from "react";
import { applyPalette, currentPalette, PALETTES, type Palette } from "@/lib/theme";

/** The eight arrival moods as swatches. Tap one and the whole site takes its colour. */
export default function ThemeSwatches() {
  const [p, setP] = useState<Palette>(PALETTES[0]);
  useEffect(() => { setP(currentPalette()); }, []);
  return (
    <div className="theme-frame swatch-frame" role="group" aria-label="Moods and their colours">
      <div className="swatches">
        {PALETTES.map((x) => (
          <button key={x.id} type="button" className={`swatch ${p.id === x.id ? "on" : ""}`} style={{ ["--c" as string]: x.accent }} onClick={() => { setP(x); applyPalette(x); }} aria-pressed={p.id === x.id} aria-label={x.label}>
            <i aria-hidden /><span>{x.label}</span>
          </button>
        ))}
      </div>
      <div className="label"><span className="emotion">{p.label}</span><span className="muted">{p.description}</span></div>
    </div>
  );
}
