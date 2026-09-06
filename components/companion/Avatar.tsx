"use client";
/**
 * The companion's face. Drawn procedurally from an AvatarLook, so every avatar
 * in the registry (and any added later) renders through the same code: no
 * image assets, no likeness of anyone real.
 *
 * Animation is a single requestAnimationFrame loop writing attributes directly
 * (no React re-render per frame): blinks on a natural random interval,
 * breathing, a slow idle sway, gaze that drifts toward the pointer, brows and
 * mouth that ease between expression targets, and a mouth that moves with the
 * speech level while talking. Everything is small on purpose - the uncanny
 * valley is one exaggeration away.
 */
import { useEffect, useRef } from "react";
import type { AvatarLook } from "@/lib/companion/avatars";
import type { Expression } from "@/lib/companion/types";

interface Params { browLift: number; browTilt: number; browAsym: number; eyeOpen: number; curve: number; open: number; tilt: number; pupil: number; gazeX: number; gazeY: number; blush: number }

const EXPR: Record<Expression, Params> = {
  neutral:    { browLift: 0,   browTilt: 0,   browAsym: 0,   eyeOpen: 1,    curve: 0.18, open: 0,    tilt: 0,  pupil: 1,    gazeX: 0,   gazeY: 0,    blush: 0.15 },
  happy:      { browLift: 0.3, browTilt: 0,   browAsym: 0,   eyeOpen: 0.82, curve: 0.95, open: 0.12, tilt: 2,  pupil: 1,    gazeX: 0,   gazeY: 0,    blush: 0.5 },
  curious:    { browLift: 0.6, browTilt: 0.1, browAsym: 0.6, eyeOpen: 1.08, curve: 0.3,  open: 0.08, tilt: 6,  pupil: 1.05, gazeX: 0.2, gazeY: -0.1, blush: 0.2 },
  thoughtful: { browLift: 0.1, browTilt: -0.3, browAsym: 0.2, eyeOpen: 0.9, curve: 0.02, open: 0,    tilt: -4, pupil: 1,    gazeX: 0.45, gazeY: -0.5, blush: 0.1 },
  concerned:  { browLift: 0.35, browTilt: 0.7, browAsym: 0,  eyeOpen: 0.95, curve: -0.35, open: 0.04, tilt: -2, pupil: 1.05, gazeX: 0,   gazeY: 0.05, blush: 0.1 },
  excited:    { browLift: 0.85, browTilt: 0,  browAsym: 0,   eyeOpen: 1.15, curve: 1,    open: 0.45, tilt: 3,  pupil: 1.1,  gazeX: 0,   gazeY: -0.05, blush: 0.6 },
  calm:       { browLift: -0.05, browTilt: 0, browAsym: 0,   eyeOpen: 0.78, curve: 0.3,  open: 0,    tilt: 1,  pupil: 1,    gazeX: 0,   gazeY: 0.05, blush: 0.2 },
  surprised:  { browLift: 1,   browTilt: 0.2, browAsym: 0,   eyeOpen: 1.3,  curve: 0.1,  open: 0.5,  tilt: 0,  pupil: 0.85, gazeX: 0,   gazeY: -0.05, blush: 0.25 },
};

export interface AvatarProps {
  look: AvatarLook;
  expression?: Expression;
  /** Mouth moves while true. */
  speaking?: boolean;
  /** 0..1 speech level from the audio analyser; synthesised when absent. */
  level?: number;
  /** How much idle motion. */
  intensity?: "low" | "normal" | "high";
  /** Eyes drift toward the pointer. */
  gaze?: boolean;
  size?: number | string;
  className?: string;
  /** Slight "arrived" motion once, for the first meeting. */
  intro?: boolean;
}

export default function Avatar({ look, expression = "neutral", speaking = false, level, intensity = "normal", gaze = true, size = "100%", className = "", intro = false }: AvatarProps) {
  const svg = useRef<SVGSVGElement>(null);
  const refs = useRef<Record<string, SVGElement | null>>({});
  const state = useRef({ p: { ...EXPR.neutral }, blink: 1, nextBlink: 0, blinkAt: 0, gx: 0, gy: 0, tx: 0, ty: 0, lvl: 0, t0: 0, last: 0 });
  const props = useRef({ expression, speaking, level, intensity, gaze });
  props.current = { expression, speaking, level, intensity, gaze };

  // Geometry from the look.
  const rx = 50 + look.roundness * 10;
  const ry = 62 + look.roundness * 4;
  const cx = 100, cy = 112;
  const eyeY = cy - 8, eyeDx = 21;
  const mouthY = cy + 30;

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const R = refs.current;
    const s = state.current;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      s.tx = Math.max(-1, Math.min(1, ((e.clientX - (b.left + b.width / 2)) / (b.width * 0.9))));
      s.ty = Math.max(-1, Math.min(1, ((e.clientY - (b.top + b.height / 2)) / (b.height * 0.9))));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const set = (k: string, a: string, v: string) => R[k]?.setAttribute(a, v);
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!s.t0) s.t0 = now;
      const t = (now - s.t0) / 1000;
      const P = props.current;
      const amp = reduce ? 0 : P.intensity === "low" ? 0.5 : P.intensity === "high" ? 1.5 : 1;
      const target = EXPR[P.expression] ?? EXPR.neutral;
      // Ease every expression parameter toward its target.
      const dt = s.last ? Math.min(0.1, (now - s.last) / 1000) : 0.016;
      s.last = now;
      const k = 1 - Math.exp(-dt * 6);
      for (const key of Object.keys(target) as (keyof Params)[]) s.p[key] += (target[key] - s.p[key]) * k;
      // Blinks: every 2.5-6s, 120ms closed, occasionally a double.
      if (!s.nextBlink) s.nextBlink = now + 1500 + Math.random() * 3000;
      if (now >= s.nextBlink && !s.blinkAt) { s.blinkAt = now; s.nextBlink = now + 2500 + Math.random() * 3500 + (Math.random() < 0.15 ? -2200 : 0); }
      if (s.blinkAt) { const ph = (now - s.blinkAt) / 150; s.blink = ph < 0.5 ? 1 - ph * 2 : ph < 1 ? (ph - 0.5) * 2 : 1; if (ph >= 1) s.blinkAt = 0; }
      // Gaze: toward the pointer, plus the expression's bias, with slow wander.
      const wx = Math.sin(t * 0.37) * 0.15, wy = Math.cos(t * 0.29) * 0.1;
      const gx = (P.gaze ? s.tx * 0.7 : 0) + s.p.gazeX + wx * amp, gy = (P.gaze ? s.ty * 0.5 : 0) + s.p.gazeY + wy * amp;
      s.gx += (gx - s.gx) * 0.08; s.gy += (gy - s.gy) * 0.08;
      // Speech level: analyser when given, else a plausible synthetic envelope.
      const want = P.speaking ? (P.level ?? (0.35 + 0.35 * Math.abs(Math.sin(t * 9.3)) * Math.abs(Math.sin(t * 3.1 + 1)))) : 0;
      s.lvl += (want - s.lvl) * 0.35;
      // Breathing + sway + talk bob.
      const breath = Math.sin(t * 1.1) * 1.2 * amp;
      const sway = Math.sin(t * 0.5) * 1.6 * amp + Math.sin(t * 0.83) * 0.6 * amp;
      const bob = s.lvl * 1.5 * amp;
      const tilt = s.p.tilt * (0.6 + 0.4 * amp) + Math.sin(t * 0.41) * 1.2 * amp;
      set("head", "transform", `translate(${sway.toFixed(2)} ${(breath - bob).toFixed(2)}) rotate(${tilt.toFixed(2)} ${cx} ${cy + 40})`);
      set("body", "transform", `translate(0 ${(breath * 0.6).toFixed(2)})`);
      // Eyes: open amount = expression × blink.
      const open = Math.max(0.04, s.p.eyeOpen * s.blink);
      for (const side of ["L", "R"] as const) {
        const ex = cx + (side === "L" ? -eyeDx : eyeDx);
        set("eye" + side, "transform", `translate(${ex} ${eyeY}) scale(1 ${open.toFixed(3)}) translate(${-ex} ${-eyeY})`);
        set("iris" + side, "transform", `translate(${(s.gx * 3.2).toFixed(2)} ${(s.gy * 2.2).toFixed(2)}) scale(${s.p.pupil.toFixed(3)})`);
        const asym = side === "L" ? s.p.browAsym : 0;
        const lift = (s.p.browLift + asym * 0.5) * 5;
        const rot = (side === "L" ? -1 : 1) * s.p.browTilt * 12;
        set("brow" + side, "transform", `translate(0 ${(-lift).toFixed(2)}) rotate(${rot.toFixed(2)} ${ex} ${eyeY - 14})`);
      }
      // Mouth: a closed curve that opens into a lens while speaking.
      const w = 13 + s.p.open * 2;
      const curve = s.p.curve * 7 - s.lvl * 2;
      const openPx = (s.p.open + s.lvl * 0.7) * 11;
      set("mouth", "d", `M ${cx - w} ${mouthY} Q ${cx} ${mouthY + curve} ${cx + w} ${mouthY} Q ${cx} ${mouthY + curve + openPx} ${cx - w} ${mouthY} Z`);
      set("lip", "d", `M ${cx - w} ${mouthY} Q ${cx} ${mouthY + curve} ${cx + w} ${mouthY}`);
      set("blush", "opacity", (0.25 + s.p.blush * 0.5).toFixed(2));
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); };
  }, [cx, cy, eyeY, mouthY]);

  const reg = (k: string) => (n: SVGElement | null) => { refs.current[k] = n; };
  const hairBack = backHair(look, cx, cy, rx, ry);
  const hairFront = frontHair(look, cx, cy, rx, ry);
  const shade = darken(look.skin, 0.18);
  const hairHi = lighten(look.hair, 0.22);

  return (
    <svg ref={svg} viewBox="0 0 200 240" width={size} height={size} className={`cmp-avatar ${intro ? "cmp-avatar-intro" : ""} ${className}`} role="img" aria-label="Your companion" style={{ ["--accent" as string]: look.accent }}>
      <defs>
        <radialGradient id="cmpGlow" cx="50%" cy="45%" r="50%"><stop offset="0%" stopColor={look.accent} stopOpacity=".55" /><stop offset="70%" stopColor={look.accent} stopOpacity=".08" /><stop offset="100%" stopColor={look.accent} stopOpacity="0" /></radialGradient>
        <linearGradient id="cmpSkin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lighten(look.skin, 0.06)} /><stop offset="100%" stopColor={shade} /></linearGradient>
        <pattern id="cmpPx" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="none" /><rect width="1" height="1" fill="#fff" opacity=".07" /></pattern>
        <clipPath id="cmpFace"><ellipse cx={cx} cy={cy} rx={rx} ry={ry} /></clipPath>
      </defs>
      <circle cx={cx} cy={cy + 6} r={96} fill="url(#cmpGlow)" className="cmp-avatar-glow" />
      {/* shoulders */}
      <g ref={reg("body")}>
        <path d={`M ${cx - 74} 240 C ${cx - 74} 196 ${cx - 40} 178 ${cx - 22} 172 L ${cx + 22} 172 C ${cx + 40} 178 ${cx + 74} 196 ${cx + 74} 240 Z`} fill={darken(look.accent, 0.55)} opacity=".9" />
        <path d={`M ${cx - 74} 240 C ${cx - 74} 196 ${cx - 40} 178 ${cx - 22} 172 L ${cx + 22} 172 C ${cx + 40} 178 ${cx + 74} 196 ${cx + 74} 240 Z`} fill="url(#cmpPx)" />
        <rect x={cx - 15} y={cy + ry - 14} width={30} height={26} rx={8} fill={shade} />
      </g>
      <g ref={reg("head")}>
        {hairBack && <path d={hairBack} fill={look.hair} />}
        {/* ears */}
        <ellipse cx={cx - rx + 2} cy={cy + 2} rx={7} ry={10} fill={shade} />
        <ellipse cx={cx + rx - 2} cy={cy + 2} rx={7} ry={10} fill={shade} />
        {look.earrings && <><circle cx={cx - rx + 1} cy={cy + 13} r={2.4} fill={look.accent} /><circle cx={cx + rx - 1} cy={cy + 13} r={2.4} fill={look.accent} /></>}
        {/* face */}
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#cmpSkin)" />
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#cmpPx)" />
        <g clipPath="url(#cmpFace)">
          <g ref={reg("blush")} opacity=".3">
            <ellipse cx={cx - 30} cy={cy + 14} rx={10} ry={5} fill={look.accent} opacity=".45" />
            <ellipse cx={cx + 30} cy={cy + 14} rx={10} ry={5} fill={look.accent} opacity=".45" />
          </g>
          {look.freckles && <g fill={darken(look.skin, 0.32)} opacity=".7">{[-30, -24, -18, 18, 24, 30, -26, 26].map((dx, i) => <circle key={i} cx={cx + dx} cy={cy + 12 + (i % 3) * 3} r={1} />)}</g>}
        </g>
        {/* brows */}
        {(["L", "R"] as const).map((side) => { const ex = cx + (side === "L" ? -eyeDx : eyeDx); const d = side === "L" ? -1 : 1; return (
          <path key={side} ref={reg("brow" + side)} d={`M ${ex - 10 * d} ${eyeY - 13} Q ${ex} ${eyeY - 17} ${ex + 10 * d} ${eyeY - 14}`} stroke={look.hair} strokeWidth={3} strokeLinecap="round" fill="none" />
        ); })}
        {/* eyes */}
        {(["L", "R"] as const).map((side) => { const ex = cx + (side === "L" ? -eyeDx : eyeDx); return (
          <g key={side} ref={reg("eye" + side)}>
            <ellipse cx={ex} cy={eyeY} rx={9.5} ry={6.2} fill="#fbf7f2" />
            <g ref={reg("iris" + side)} style={{ transformOrigin: `${ex}px ${eyeY}px` }}>
              <circle cx={ex} cy={eyeY} r={4.3} fill={look.eyes} />
              <circle cx={ex} cy={eyeY} r={2} fill="#0d0b0b" />
              <circle cx={ex + 1.6} cy={eyeY - 1.6} r={1.1} fill="#fff" opacity=".9" />
            </g>
            <path d={`M ${ex - 9.5} ${eyeY} Q ${ex} ${eyeY - 8} ${ex + 9.5} ${eyeY}`} stroke={darken(look.skin, 0.45)} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          </g>
        ); })}
        {/* nose */}
        <path d={`M ${cx} ${cy + 4} q -4 10 2 12`} stroke={darken(look.skin, 0.3)} strokeWidth={1.6} fill="none" strokeLinecap="round" />
        {/* mouth */}
        <path ref={reg("mouth")} d="" fill={darken(look.accent, 0.55)} />
        <path ref={reg("lip")} d="" stroke={darken(look.accent, 0.35)} strokeWidth={2} fill="none" strokeLinecap="round" />
        {hairFront && <path d={hairFront} fill={look.hair} />}
        {hairFront && <path d={hairFront} fill={hairHi} opacity=".12" transform={`translate(-2 -3) scale(.97)`} style={{ transformOrigin: `${cx}px ${cy}px` }} />}
        {look.glasses && <g stroke="#1a1716" strokeWidth={2} fill="rgba(255,255,255,.06)">
          <rect x={cx - eyeDx - 13} y={eyeY - 9} width={26} height={17} rx={6} /><rect x={cx + eyeDx - 13} y={eyeY - 9} width={26} height={17} rx={6} />
          <path d={`M ${cx - eyeDx + 13} ${eyeY - 1} L ${cx + eyeDx - 13} ${eyeY - 1}`} /><path d={`M ${cx - eyeDx - 13} ${eyeY - 2} L ${cx - rx + 4} ${eyeY - 4}`} /><path d={`M ${cx + eyeDx + 13} ${eyeY - 2} L ${cx + rx - 4} ${eyeY - 4}`} />
        </g>}
      </g>
    </svg>
  );
}

/* ---- hair -------------------------------------------------------------- */

function frontHair(l: AvatarLook, cx: number, cy: number, rx: number, ry: number): string {
  const top = cy - ry;
  const L = cx - rx, R = cx + rx;
  switch (l.hairStyle) {
    case "short":
      return `M ${L - 2} ${cy - 4} C ${L - 4} ${top - 46} ${R + 4} ${top - 46} ${R + 2} ${cy - 4} C ${R - 6} ${cy - 30} ${R - 22} ${cy - 38} ${cx + 6} ${cy - 36} C ${cx - 10} ${cy - 44} ${L + 8} ${cy - 34} ${L - 2} ${cy - 4} Z`;
    case "undercut":
      return `M ${L + 10} ${cy - 30} C ${L + 6} ${top - 40} ${R - 6} ${top - 40} ${R - 10} ${cy - 30} C ${R - 20} ${cy - 40} ${cx + 10} ${cy - 44} ${cx - 4} ${cy - 40} C ${cx - 18} ${cy - 40} ${L + 16} ${cy - 38} ${L + 10} ${cy - 30} Z`;
    case "bun":
      return `M ${L - 3} ${cy + 2} C ${L - 6} ${top - 44} ${R + 6} ${top - 44} ${R + 3} ${cy + 2} C ${R - 4} ${cy - 30} ${R - 30} ${cy - 40} ${cx} ${cy - 40} C ${L + 30} ${cy - 40} ${L + 4} ${cy - 30} ${L - 3} ${cy + 2} Z M ${cx - 17} ${top - 22} a 17 13 0 1 1 34 0 a 17 13 0 1 1 -34 0 Z`;
    case "curly":
      return `M ${L - 6} ${cy - 8} c -8 -18 -2 -40 10 -50 c 4 -18 20 -26 32 -24 c 10 -12 30 -12 40 0 c 12 -2 28 6 32 24 c 12 10 18 32 10 50 c -4 -12 -14 -20 -24 -22 c -8 -8 -20 -12 -30 -10 c -10 -2 -22 2 -30 10 c -10 2 -20 10 -30 22 Z`;
    case "waves":
      return `M ${L - 4} ${cy + 8} C ${L - 8} ${top - 46} ${R + 8} ${top - 46} ${R + 4} ${cy + 8} C ${R - 2} ${cy - 26} ${R - 24} ${cy - 36} ${cx + 14} ${cy - 30} C ${cx + 2} ${cy - 42} ${L + 10} ${cy - 30} ${L - 4} ${cy + 8} Z`;
    case "long":
    default:
      return `M ${L - 4} ${cy + 6} C ${L - 8} ${top - 46} ${R + 8} ${top - 46} ${R + 4} ${cy + 6} C ${R - 4} ${cy - 30} ${R - 28} ${cy - 38} ${cx - 2} ${cy - 36} C ${L + 12} ${cy - 40} ${L + 4} ${cy - 26} ${L - 4} ${cy + 6} Z`;
  }
}

function backHair(l: AvatarLook, cx: number, cy: number, rx: number, ry: number): string | null {
  const top = cy - ry;
  const L = cx - rx, R = cx + rx;
  switch (l.hairStyle) {
    case "long":
      return `M ${L - 10} ${cy + 70} C ${L - 14} ${cy} ${L - 10} ${top - 34} ${cx} ${top - 36} C ${R + 10} ${top - 34} ${R + 14} ${cy} ${R + 10} ${cy + 70} Z`;
    case "waves":
      return `M ${L - 14} ${cy + 66} c -4 -20 4 -34 -2 -52 C ${L - 6} ${top - 34} ${R + 6} ${top - 34} ${R + 16} ${cy + 14} c -6 18 2 32 -2 52 c -8 4 -14 -2 -18 -8 c -4 8 -12 8 -16 2 c -6 8 -14 8 -20 0 c -4 8 -12 8 -16 2 c -4 6 -10 10 -18 6 Z`;
    case "curly":
      return `M ${L - 12} ${cy + 20} c -12 -24 -8 -56 10 -72 c 6 -22 28 -30 42 -26 c 14 -12 36 -8 46 6 c 20 2 34 24 28 48 c 10 14 6 34 -6 44 c -2 10 -14 14 -22 8 c -10 12 -30 12 -40 2 c -12 8 -30 6 -38 -6 c -8 2 -14 -6 -12 -14 Z`;
    case "bun":
    case "short":
    case "undercut":
    default:
      return null;
  }
}

/* ---- colour helpers ---------------------------------------------------- */

function hex(c: string): [number, number, number] {
  const m = c.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((x) => x + x).join("") : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
export function darken(c: string, k: number): string { const [r, g, b] = hex(c); return toHex(r * (1 - k), g * (1 - k), b * (1 - k)); }
export function lighten(c: string, k: number): string { const [r, g, b] = hex(c); return toHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k); }
