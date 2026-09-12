"use client";
/**
 * The chat's living background: soft light drifting behind the conversation.
 * It follows the eight-axis read (warm and cool tints, dimming), leans toward
 * the pointer, breathes with the microphone while you talk, and sends a ring
 * out from the composer whenever a reply lands. One canvas at half resolution,
 * ~30fps, paused when the tab is hidden, still under reduced motion.
 */
import { useEffect, useRef } from "react";

export interface BgProps {
  tint: { warm: number; cool: number; dim: number };
  /** 0..1 microphone level while recording. */
  level: number;
  /** Increment to send a ripple. */
  pulse: number;
  /** True while the person is speaking or being spoken to. */
  active: boolean;
}

interface Blob { x: number; y: number; r: number; ax: number; ay: number; sx: number; sy: number; ph: number; tone: number; depth: number }
interface Particle { x: number; y: number; vx: number; vy: number; s: number; a: number }
interface Ripple { x: number; y: number; t0: number }

const rgb = (s: string, fallback: [number, number, number]): [number, number, number] => {
  const m = s.split(",").map((x) => parseFloat(x)); return m.length === 3 && m.every((n) => !Number.isNaN(n)) ? [m[0], m[1], m[2]] : fallback;
};
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export default function LivingBackground({ tint, level, pulse, active }: BgProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const st = useRef({ tint, level, active, pointer: { x: 0.5, y: 0.5 }, target: { x: 0.5, y: 0.5 }, ripples: [] as Ripple[], lvl: 0 });
  st.current.tint = tint; st.current.level = level; st.current.active = active;
  const lastPulse = useRef(pulse);

  useEffect(() => {
    if (pulse !== lastPulse.current) { lastPulse.current = pulse; st.current.ripples.push({ x: 0.5, y: 0.86, t0: performance.now() }); }
  }, [pulse]);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const world = cv.closest<HTMLElement>(".world") ?? document.documentElement;
    let warm: [number, number, number] = [255, 181, 154], accent: [number, number, number] = [240, 135, 106], cool: [number, number, number] = [127, 208, 224];
    const readColours = () => {
      const cs = getComputedStyle(world);
      warm = rgb(cs.getPropertyValue("--accent2-rgb"), warm); accent = rgb(cs.getPropertyValue("--accent-rgb"), accent); cool = rgb(cs.getPropertyValue("--cool-rgb"), cool);
    };
    readColours();
    const colourTimer = window.setInterval(readColours, 2000);

    const rnd = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
    const blobs: Blob[] = Array.from({ length: 9 }, (_, i) => ({
      x: 0.1 + rnd(i) * 0.8, y: 0.1 + rnd(i + 10) * 0.8, r: 0.16 + rnd(i + 20) * 0.2,
      ax: 0.05 + rnd(i + 30) * 0.08, ay: 0.04 + rnd(i + 40) * 0.07, sx: 0.08 + rnd(i + 50) * 0.1, sy: 0.06 + rnd(i + 60) * 0.1,
      ph: rnd(i + 70) * Math.PI * 2, tone: rnd(i + 80), depth: 0.4 + rnd(i + 90) * 0.8,
    }));
    const parts: Particle[] = Array.from({ length: 110 }, (_, i) => ({ x: rnd(i + 200), y: rnd(i + 300), vx: 0, vy: 0, s: 0.6 + rnd(i + 400) * 1.6, a: 0.12 + rnd(i + 500) * 0.3 }));

    let W = 0, H = 0;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      W = Math.max(2, Math.round(r.width * 0.5)); H = Math.max(2, Math.round(r.height * 0.5));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(cv);
    const onMove = (e: PointerEvent) => { st.current.target = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }; };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0, last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (t - last < 33) return; last = t;
      const s = st.current;
      const sec = t / 1000;
      const amt = reduced ? 0 : 1;
      s.pointer.x += (s.target.x - s.pointer.x) * 0.04; s.pointer.y += (s.target.y - s.pointer.y) * 0.04;
      s.lvl += ((s.active ? s.level : 0) - s.lvl) * 0.3;
      const { warm: wT, cool: cT, dim } = s.tint;
      ctx.clearRect(0, 0, W, H);

      // Light: additive blobs, warm or cool by their tone and the current read.
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        const x = (b.x + Math.sin(sec * b.sx + b.ph) * b.ax * amt + (s.pointer.x - 0.5) * 0.08 * b.depth) * W;
        const y = (b.y + Math.cos(sec * b.sy + b.ph * 1.3) * b.ay * amt + (s.pointer.y - 0.5) * 0.08 * b.depth) * H;
        const breathe = 1 + Math.sin(sec * 0.9 + b.ph) * 0.05 * amt + s.lvl * 0.35 * b.depth;
        const r = b.r * Math.max(W, H) * breathe;
        const coolness = Math.min(1, Math.max(0, b.tone * 0.6 + cT * 0.7 - wT * 0.4));
        const c = mix(mix(warm, accent, b.tone * 0.5), cool, coolness);
        const alpha = (0.08 + 0.14 * (1 - dim * 0.6)) * (0.7 + 0.3 * b.depth) * (1 + s.lvl * 0.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha.toFixed(3)})`);
        g.addColorStop(0.55, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${(alpha * 0.35).toFixed(3)})`);
        g.addColorStop(1, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }

      // Dust: a slow flow field, nudged away from the pointer, stirred by the voice.
      ctx.globalCompositeOperation = "screen";
      for (const p of parts) {
        if (amt) {
          const fx = Math.sin(p.y * 6.3 + sec * 0.25) * 0.00035, fy = Math.cos(p.x * 5.1 + sec * 0.2) * 0.00028 - 0.00012;
          const dx = p.x - s.pointer.x, dy = p.y - s.pointer.y, d2 = dx * dx + dy * dy;
          const push = d2 < 0.03 ? (0.03 - d2) * 0.02 : 0;
          p.vx += fx + dx * push + (Math.random() - 0.5) * s.lvl * 0.003; p.vy += fy + dy * push + (Math.random() - 0.5) * s.lvl * 0.003;
          p.vx *= 0.96; p.vy *= 0.96; p.x += p.vx; p.y += p.vy;
          if (p.x < -0.02) p.x = 1.02; if (p.x > 1.02) p.x = -0.02; if (p.y < -0.02) p.y = 1.02; if (p.y > 1.02) p.y = -0.02;
        }
        const c = mix(warm, cool, cT * 0.6);
        ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${(p.a * (1 - dim * 0.5) * (1 + s.lvl)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.s, 0, Math.PI * 2); ctx.fill();
      }

      // Rings: a reply landing.
      const now = performance.now();
      s.ripples = s.ripples.filter((r) => now - r.t0 < 1800);
      for (const r of s.ripples) {
        const k = (now - r.t0) / 1800, e = 1 - Math.pow(1 - k, 3);
        const rad = e * Math.max(W, H) * 0.7;
        ctx.strokeStyle = `rgba(${accent[0]},${accent[1]},${accent[2]},${((1 - k) * 0.35).toFixed(3)})`; ctx.lineWidth = 1.2 + (1 - k) * 2;
        ctx.beginPath(); ctx.arc(r.x * W, r.y * H, rad, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      if (reduced) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); clearInterval(colourTimer); };
  }, []);

  return <canvas ref={ref} className="chat-bg" aria-hidden />;
}
