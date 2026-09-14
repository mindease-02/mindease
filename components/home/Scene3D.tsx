"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The landing page's 3D scene: one field of particles that reshapes itself
 * as the visitor scrolls. Scroll position is the timeline; nothing plays on
 * its own except a slow breath.
 *
 *   hero    - the eight-axis emotion wheel, spokes in the axis colours
 *   why     - two ribbons: people in your life rising, leaning on MindEase
 *             falling, with check-in sparks thinning out along the way
 *   demo    - the wheel again, its spokes set by the live read from the demo
 *   start   - a warm ring opening around the call to action
 *   details - the field settles into a quiet drift
 *
 * The pointer tilts the camera a little. On phones the count is lower and the
 * pixel ratio is capped; with reduced motion the scene is drawn once, still.
 */
const AXES = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"] as const;
const AXIS_COLORS = ["#f2c572", "#8fcf9a", "#b9a6e0", "#7fd0e0", "#8fb3e8", "#a9bd72", "#f0876a", "#e8a0bf"];
const TEAL = new THREE.Color("#7fd0e0"), CORAL = new THREE.Color("#f0876a"), INK = new THREE.Color("#9a9aa3");

function rand(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

type Frame = { pos: Float32Array; col: Float32Array; size: Float32Array };

function makeFrames(n: number, read: number[]): Record<string, Frame> {
  const r = rand(7);
  const base = Array.from({ length: n }, () => ({ a: r(), b: r(), c: r(), d: r() }));
  const frame = (): Frame => ({ pos: new Float32Array(n * 3), col: new Float32Array(n * 3), size: new Float32Array(n) });
  const set = (f: Frame, i: number, x: number, y: number, z: number, c: THREE.Color, s: number) => { f.pos.set([x, y, z], i * 3); f.col.set([c.r, c.g, c.b], i * 3); f.size[i] = s; };

  const wheel = (scale: number[], ringShare = 0.25): Frame => {
    const f = frame(); const axisCols = AXIS_COLORS.map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      const { a, b, c, d } = base[i];
      if (a < ringShare) {
        const ang = b * Math.PI * 2, rad = 2.2 + (c - 0.5) * 0.12;
        set(f, i, Math.cos(ang) * rad, Math.sin(ang) * rad, (d - 0.5) * 0.3, INK, 0.5 + c * 0.4);
      } else {
        const k = Math.floor(b * 8), len = 0.15 + Math.pow(c, 0.8) * 2.0 * Math.max(0.12, scale[k]);
        const ang = (k / 8) * Math.PI * 2 - Math.PI / 2, spread = 0.09 + (1 - c) * 0.25;
        const jx = (d - 0.5) * spread, jy = (a * 7919 % 1 - 0.5) * spread;
        set(f, i, Math.cos(ang) * len + jx, Math.sin(ang) * len + jy, (d - 0.5) * 0.5, axisCols[k], 0.6 + c * 1.4);
      }
    }
    return f;
  };
  const ribbons = (): Frame => {
    const f = frame();
    for (let i = 0; i < n; i++) {
      const { a, b, c, d } = base[i];
      const x = (b - 0.5) * 6.4, u = b;
      if (a < 0.44) { const y = -0.9 + Math.pow(u, 1.4) * 2.2 + (c - 0.5) * 0.28; set(f, i, x, y, (d - 0.5) * 1.2, TEAL, 0.7 + c); }
      else if (a < 0.88) { const y = 1.1 - Math.pow(u, 0.9) * 2.2 + (c - 0.5) * 0.28; set(f, i, x, y, (d - 0.5) * 1.2, CORAL, 0.7 + c); }
      else { // check-in sparks, dense early, sparse late
        const keep = Math.pow(1 - u, 2.2) > c * 0.9;
        set(f, i, x, -1.9 + (d - 0.5) * 0.12, 0.2, CORAL, keep ? 2.2 : 0);
      }
    }
    return f;
  };
  const ring = (): Frame => {
    const f = frame();
    for (let i = 0; i < n; i++) {
      const { a, b, c, d } = base[i];
      const ang = b * Math.PI * 2, rad = 2.6 + (c - 0.5) * 0.35 + (a < 0.15 ? (d - 0.5) * 1.6 : 0);
      const warm = CORAL.clone().lerp(new THREE.Color("#ffb59a"), c);
      set(f, i, Math.cos(ang) * rad, Math.sin(ang) * rad * 0.62, (d - 0.5) * 0.8, warm, 0.5 + c * 1.2);
    }
    return f;
  };
  const drift = (): Frame => {
    const f = frame();
    for (let i = 0; i < n; i++) { const { a, b, c, d } = base[i]; set(f, i, (a - 0.5) * 9, (b - 0.5) * 6, (c - 0.5) * 4, INK, 0.3 + d * 0.5); }
    return f;
  };
  return { hero: wheel([0.55, 0.7, 0.5, 0.4, 0.6, 0.35, 0.45, 0.65]), why: ribbons(), demo: wheel(read, 0.2), start: ring(), details: drift() };
}

const VERT = `
attribute vec3 posB; attribute vec3 colA; attribute vec3 colB; attribute float sizeA; attribute float sizeB;
uniform float uMix; uniform float uTime; uniform float uPixel; varying vec3 vCol; varying float vAlpha;
void main() {
  float m = smoothstep(0.0, 1.0, uMix);
  vec3 p = mix(position, posB, m);
  p += 0.035 * vec3(sin(uTime * 0.7 + p.y * 2.1), cos(uTime * 0.6 + p.x * 1.7), sin(uTime * 0.5 + p.z * 3.0));
  float s = mix(sizeA, sizeB, m);
  vCol = mix(colA, colB, m); vAlpha = clamp(s, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = s * uPixel * (10.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec3 vCol; varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5; float r = length(d);
  float a = smoothstep(0.5, 0.05, r) * 0.9 * vAlpha;
  gl_FragColor = vec4(vCol, a);
}`;

const ORDER = ["hero", "why", "demo", "start", "details"] as const;
/** Where the cloud sits per section: to the right of the copy on wide screens, low behind the headline on phones. */
const OFFSET: Record<string, [number, number]> = { hero: [2.4, 0], why: [2.7, 0.2], demo: [2.4, 0.6], start: [0, 0], details: [0, 0] };
const OFFSET_PHONE: Record<string, [number, number]> = { hero: [0, -0.9], why: [0, -1.4], demo: [0, 1.2], start: [0, 0], details: [0, 0] };

export default function Scene3D() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 720px)").matches;
    const n = phone ? 2600 : 5200;
    let read = [0.55, 0.7, 0.5, 0.4, 0.6, 0.35, 0.45, 0.65];
    let frames = makeFrames(n, read);

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" }); }
    catch { return; } // no WebGL: the page works without the scene
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, phone ? 1.5 : 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.1, 50);
    camera.position.set(0, 0, 8.5);

    const geo = new THREE.BufferGeometry();
    const attr = (arr: Float32Array, size: number) => new THREE.BufferAttribute(arr, size).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", attr(frames.hero.pos.slice(), 3));
    geo.setAttribute("posB", attr(frames.why.pos.slice(), 3));
    geo.setAttribute("colA", attr(frames.hero.col.slice(), 3));
    geo.setAttribute("colB", attr(frames.why.col.slice(), 3));
    geo.setAttribute("sizeA", attr(frames.hero.size.slice(), 1));
    geo.setAttribute("sizeB", attr(frames.why.size.slice(), 1));
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uMix: { value: 0 }, uTime: { value: 0 }, uPixel: { value: renderer.getPixelRatio() * (phone ? 2.2 : 2.8) } } });
    const points = new THREE.Points(geo, mat); scene.add(points);

    let segA = "hero", segB = "why";
    const load = (a: string, b: string) => {
      if (a === segA && b === segB) return; segA = a; segB = b;
      const A = frames[a], B = frames[b];
      (geo.getAttribute("position") as THREE.BufferAttribute).copyArray(A.pos).needsUpdate = true;
      (geo.getAttribute("posB") as THREE.BufferAttribute).copyArray(B.pos).needsUpdate = true;
      (geo.getAttribute("colA") as THREE.BufferAttribute).copyArray(A.col).needsUpdate = true;
      (geo.getAttribute("colB") as THREE.BufferAttribute).copyArray(B.col).needsUpdate = true;
      (geo.getAttribute("sizeA") as THREE.BufferAttribute).copyArray(A.size).needsUpdate = true;
      (geo.getAttribute("sizeB") as THREE.BufferAttribute).copyArray(B.size).needsUpdate = true;
    };

    // Scroll is the timeline: each section's top-to-top span is one segment.
    const tops = () => ORDER.map((id) => { const s = document.getElementById(id === "hero" ? "top" : id); return s ? s.getBoundingClientRect().top + window.scrollY : 0; });
    let anchors = tops();
    let mix = 0, targetMix = 0, rotX = 0, rotY = 0, tRotX = 0, tRotY = 0, px = 0, py = 0;
    const offsets = phone ? OFFSET_PHONE : OFFSET;
    let ox = offsets.hero[0], oy = offsets.hero[1], tox = ox, toy = oy;
    const onScroll = () => {
      const y = window.scrollY + window.innerHeight * 0.35;
      let i = 0; while (i < ORDER.length - 2 && y >= anchors[i + 1]) i++;
      const span = Math.max(1, anchors[i + 1] - anchors[i]);
      const t = Math.min(1, Math.max(0, (y - anchors[i]) / span));
      load(ORDER[i], ORDER[i + 1]); targetMix = t;
      const a = offsets[ORDER[i]], b = offsets[ORDER[i + 1]];
      tox = a[0] + (b[0] - a[0]) * t; toy = a[1] + (b[1] - a[1]) * t;
      tRotY = (i + t) * 0.55; tRotX = Math.sin((i + t) * 1.3) * 0.18;
    };
    const onPointer = (e: PointerEvent) => { px = (e.clientX / window.innerWidth - 0.5) * 0.35; py = (e.clientY / window.innerHeight - 0.5) * 0.25; };
    const onRead = (e: Event) => {
      const axes = (e as CustomEvent<Record<string, number>>).detail; if (!axes) return;
      read = AXES.map((a) => axes[a] ?? 0);
      frames = { ...frames, demo: makeFrames(n, read).demo };
      const a = segA, b = segB; segA = ""; load(a, b);
    };
    const onResize = () => { renderer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); anchors = tops(); onScroll(); };

    let raf = 0, last = performance.now(), visible = true;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      mix += (targetMix - mix) * Math.min(1, dt * 6);
      rotY += (tRotY + px - rotY) * Math.min(1, dt * 3); rotX += (tRotX + py - rotX) * Math.min(1, dt * 3);
      points.rotation.set(rotX, rotY, 0);
      ox += (tox - ox) * Math.min(1, dt * 4); oy += (toy - oy) * Math.min(1, dt * 4);
      points.position.set(ox, oy, 0);
      mat.uniforms.uMix.value = mix; mat.uniforms.uTime.value = reduced ? 0 : now / 1000;
      renderer.render(scene, camera);
      if (!reduced && visible) raf = requestAnimationFrame(tick);
    };
    const onVis = () => { visible = !document.hidden; if (visible && !reduced) { last = performance.now(); raf = requestAnimationFrame(tick); } };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("me:read", onRead);
    document.addEventListener("visibilitychange", onVis);
    const settle = setTimeout(() => { anchors = tops(); onScroll(); }, 600);
    onScroll(); mix = targetMix; ox = tox; oy = toy; raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(settle);
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); window.removeEventListener("pointermove", onPointer); window.removeEventListener("me:read", onRead); document.removeEventListener("visibilitychange", onVis);
      geo.dispose(); mat.dispose(); renderer.dispose(); el.removeChild(renderer.domElement);
    };
  }, []);
  return <div ref={host} className="scene3d" aria-hidden />;
}
