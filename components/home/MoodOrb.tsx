"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { applyPalette, currentPalette, nextPalette, PALETTES, type Palette } from "@/lib/theme";
import { moodText } from "@/lib/i18n";

/**
 * The colour-changing ball, kept and improved: a 3D sphere that takes the
 * colour of the mood you pick, floats, follows the pointer, and turns the
 * whole site that colour. No ring around it. Tap the ball to move to the next mood; tap a
 * swatch to pick one. The same eight moods the chat asks about on arrival.
 *
 * The surface changes with the mood, not only the colour: angry grows
 * spikes; heavy sags, goes wet and cracks; anxious trembles with a rough,
 * pale skin; restless throws sparks; hopeful shimmers; lonely thins to a
 * rim-lit ghost; numb goes frosted and matte; okay stays smooth and soft.
 * All of it is one material with a few dials, so it reads as the same ball.
 *
 * Phones get a lighter sphere. If frames stay slow the pixel ratio drops to 1
 * and the ball stops floating on its own: it is drawn for a moment after a
 * tap or a pointer move, then rests.
 */
/** Surface dials per mood, 0..1 unless noted. Lerped, so a change of mood is a change of skin, not a cut. */
type Skin = { spike: number; rough: number; droop: number; crack: number; tremble: number; spark: number; shimmer: number; ghost: number; pale: number; roughness: number; clearcoat: number; emissive: number; spin: number; pulse: number;
  /** The halo: how bright, how wide, and what it does: flare in rays, flicker, sag, thin to a far ring, throw sparks. */
  halo: number; haloSpread: number; haloRays: number; haloFlicker: number; haloDroop: number; haloRing: number; haloSparks: number };
const BASE: Skin = { spike: 0, rough: 0, droop: 0, crack: 0, tremble: 0, spark: 0, shimmer: 0, ghost: 0, pale: 0, roughness: 0.25, clearcoat: 1, emissive: 0.18, spin: 0.15, pulse: 1.3, halo: 0.55, haloSpread: 1, haloRays: 0, haloFlicker: 0, haloDroop: 0, haloRing: 0, haloSparks: 0 };
const SKINS: Record<string, Partial<Skin>> = {
  okay: { shimmer: 0.15 },
  hopeful: { shimmer: 1, spark: 0.35, emissive: 0.34, roughness: 0.18, spin: 0.25, halo: 0.85, haloSpread: 1.12 },
  heavy: { droop: 1, crack: 0.7, roughness: 0.06, emissive: 0.06, spin: 0.05, pulse: 0.6, halo: 0.5, haloSpread: 1.0, haloDroop: 1 },
  lonely: { ghost: 1, roughness: 0.5, emissive: 0.04, spin: 0.08, halo: 0.45, haloSpread: 1.1, haloRing: 1 },
  anxious: { rough: 0.8, tremble: 1, crack: 0.45, pale: 0.55, roughness: 0.7, emissive: 0.1, spin: 0.3, pulse: 3, halo: 0.6, haloFlicker: 1 },
  angry: { spike: 1, roughness: 0.4, emissive: 0.5, spin: 0.35, pulse: 2.2, halo: 1.0, haloSpread: 1.12, haloRays: 1 },
  restless: { spark: 1, shimmer: 0.4, emissive: 0.42, roughness: 0.3, spin: 0.7, pulse: 3.5, halo: 0.9, haloSpread: 1.15, haloFlicker: 0.5, haloSparks: 1 },
  numb: { rough: 0.35, pale: 0.85, roughness: 0.95, clearcoat: 0, emissive: 0, spin: 0.03, pulse: 0.4, halo: 0.12, haloSpread: 0.85 },
};

/** The halo: a camera-facing plane behind the ball, drawn as a radial glow with the mood's dials. */
const HALO_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HALO_FRAG = `
uniform vec3 uColor, uColor2; uniform float uTime, uI, uSpread, uRays, uFlicker, uDroop, uRing, uSparks, uPulse;
varying vec2 vUv;
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 c = (vUv - 0.5) * 2.0;
  // heavy: the glow hangs below the ball
  c.y = c.y > 0.0 ? c.y * (1.0 + 0.45 * uDroop) : c.y * (1.0 - 0.28 * uDroop);
  float d = length(c) / uSpread;
  float ang = atan(c.y, c.x);
  float breath = 1.0 + 0.06 * sin(uTime * uPulse);
  float rays = 1.0 + uRays * 1.1 * pow(abs(sin(ang * 7.0 + uTime * 1.1)), 14.0) * smoothstep(0.45, 0.9, d);
  float flick = 1.0 - uFlicker * 0.55 * n2(vec2(uTime * 11.0, ang * 1.5));
  float glow = pow(max(0.0, 1.0 - d / (breath * rays)), 1.25) * 1.7;
  float ring = uRing * smoothstep(0.06, 0.0, abs(d - 0.74)) * 1.4 * (0.7 + 0.3 * sin(uTime * 0.8 + ang * 2.0));
  float sp = n2(vec2(ang * 24.0, d * 10.0 - uTime * 1.5));
  float sparks = uSparks * smoothstep(0.9, 1.0, sp) * 2.0 * smoothstep(0.55, 0.75, d) * smoothstep(1.1, 0.95, d);
  // Fade before the plane's edge so nothing is ever cut square.
  float edge = smoothstep(1.0, 0.72, length(c));
  float a = clamp((glow * flick + ring + sparks) * uI * edge, 0.0, 1.0);
  vec3 col = mix(uColor, uColor2, smoothstep(0.3, 1.0, d));
  gl_FragColor = vec4(col * a, a);
}`;
const skinFor = (id: string): Skin => ({ ...BASE, ...(SKINS[id] ?? {}) });

const NOISE = `
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
const VERT_HEAD = `uniform float uTime, uSpike, uRough, uDroop, uTremble; varying vec3 vPos; ${NOISE}`;
const VERT_BODY = `
  vec3 transformed = vec3(position);
  vec3 nrm = normalize(position);
  float g = abs(sin(nrm.x * 13.0 + 1.3) * sin(nrm.y * 13.0 + 2.1) * sin(nrm.z * 13.0 + 0.7));
  float spike = pow(g, 10.0) * 0.42 * uSpike;
  float rough = (vnoise(nrm * 16.0 + uTime * 0.15) - 0.5) * 0.09 * uRough;
  float trem = (vnoise(nrm * 5.0 + uTime * 7.0) - 0.5) * 0.05 * uTremble;
  transformed += nrm * (spike + rough + trem);
  transformed.y -= uDroop * 0.24 * smoothstep(0.3, -1.0, nrm.y);
  transformed.y *= 1.0 - 0.14 * uDroop;
  transformed.xz *= 1.0 + 0.07 * uDroop;
  vPos = nrm;
`;
const FRAG_HEAD = `uniform float uTime, uCrack, uSpark, uShimmer, uGhost, uPale; varying vec3 vPos; ${NOISE}`;
const FRAG_BODY = `
  #include <dithering_fragment>
  {
    vec3 n = normalize(vPos);
    float f = vnoise(n * 4.5 + 3.0);
    float crack = smoothstep(0.04, 0.0, abs(f - 0.5)) * uCrack;
    gl_FragColor.rgb *= 1.0 - crack * 0.8;
    float sp = smoothstep(0.86, 1.0, vnoise(n * 28.0 + vec3(0.0, uTime * 1.6, 0.0))) * uSpark;
    gl_FragColor.rgb += sp * vec3(1.0, 0.92, 0.7) * (0.6 + 0.4 * sin(uTime * 9.0 + f * 40.0));
    vec3 iri = 0.5 + 0.5 * cos(6.2831 * (dot(n, vec3(0.3, 0.6, 0.7)) * 1.6 + uTime * 0.12 + vec3(0.0, 0.33, 0.67)));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * (0.65 + 0.7 * iri), uShimmer * 0.7);
    float l = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(l) * 0.85 + 0.06, uPale * 0.7);
    vec3 vdir = normalize(vViewPosition);
    float rim = pow(1.0 - max(dot(normalize(normal), vdir), 0.0), 1.4);
    gl_FragColor.a *= mix(1.0, 0.3 + 0.7 * rim, uGhost);
    gl_FragColor.rgb += rim * uGhost * 0.25;
  }
`;

export default function MoodOrb({ lang }: { lang: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [p, setP] = useState<Palette>(PALETTES[0]);
  const target = useRef({ accent: new THREE.Color(PALETTES[0].accent), accent2: new THREE.Color(PALETTES[0].accent2), cool: new THREE.Color(PALETTES[0].cool) });
  const skin = useRef<Skin>(skinFor(PALETTES[0].id));

  useEffect(() => { const c = currentPalette(); setP(c); }, []);
  useEffect(() => { target.current = { accent: new THREE.Color(p.accent), accent2: new THREE.Color(p.accent2), cool: new THREE.Color(p.cool) }; skin.current = skinFor(p.id); }, [p]);

  useEffect(() => {
    const el = host.current; if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 720px)").matches;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !phone, alpha: true, powerPreference: "low-power" }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, phone ? 1.5 : 2));
    const size = () => Math.min(el.clientWidth, 340);
    renderer.setSize(size(), size()); el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20); camera.position.set(0, 0, 7.3);

    const mat = new THREE.MeshPhysicalMaterial({ color: target.current.accent, roughness: 0.25, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.6, sheenColor: target.current.accent2, emissive: target.current.accent, emissiveIntensity: 0.18, transparent: true });
    // The mood dials, as uniforms spliced into the standard material so lighting stays right.
    const U = { uTime: { value: 0 }, uSpike: { value: 0 }, uRough: { value: 0 }, uDroop: { value: 0 }, uTremble: { value: 0 }, uCrack: { value: 0 }, uSpark: { value: 0 }, uShimmer: { value: 0 }, uGhost: { value: 0 }, uPale: { value: 0 } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>\n${VERT_HEAD}`).replace("#include <begin_vertex>", VERT_BODY);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\n${FRAG_HEAD}`).replace("#include <dithering_fragment>", FRAG_BODY);
    };
    mat.customProgramCacheKey = () => "mood-orb";
    const live: Skin = { ...skinFor(currentPalette().id) };
    const seg = phone ? 64 : 96;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.15, seg, seg), mat); scene.add(ball);
    const H = { uColor: { value: target.current.accent2.clone() }, uColor2: { value: target.current.cool.clone() }, uTime: { value: 0 }, uI: { value: 0.45 }, uSpread: { value: 1 }, uRays: { value: 0 }, uFlicker: { value: 0 }, uDroop: { value: 0 }, uRing: { value: 0 }, uSparks: { value: 0 }, uPulse: { value: 1.3 } };
    const haloMat = new THREE.ShaderMaterial({ vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, uniforms: H, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), haloMat); halo.position.z = -0.4; halo.renderOrder = -1; scene.add(halo);
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(target.current.cool, 1.6); rim.position.set(-4, -2, -3); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x101018, 0.9));

    let px = 0, py = 0, tx = 0, ty = 0, raf = 0, last = performance.now(), pulse = 0;
    // Governor: after slow frames, drop to 1x pixels; if still slow, rest between interactions.
    let warm = 0, slowRun = 0, avg = 16, rest = false, awakeUntil = Infinity, running = true;
    el.dataset.quality = "full";
    const wake = () => { awakeUntil = performance.now() + 1800; if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } };
    const govern = (dt: number) => {
      if (rest || reduced) return;
      if (warm < 90) { warm++; return; }
      avg += (dt * 1000 - avg) * 0.1;
      slowRun = avg > 34 ? slowRun + 1 : 0;
      if (slowRun < 45) return;
      slowRun = 0; warm = 30; avg = 16;
      if (renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); renderer.setSize(size(), size()); el.dataset.quality = "half"; }
      else { rest = true; el.dataset.quality = "rest"; awakeUntil = performance.now() + 600; }
    };
    const onMove = (e: PointerEvent) => { if (e.pointerType === "touch") return; const r = el.getBoundingClientRect(); px = ((e.clientX - r.left) / r.width - 0.5) * 0.9; py = ((e.clientY - r.top) / r.height - 0.5) * 0.6; if (rest) wake(); };
    const onLeave = () => { px = 0; py = 0; if (rest) wake(); };
    const onPulse = () => { pulse = 1; if (rest) wake(); };
    el.addEventListener("pointermove", onMove); el.addEventListener("pointerleave", onLeave); el.addEventListener("me:orb-pulse", onPulse);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      govern(dt);
      const t = target.current, want = skin.current;
      (mat.color as THREE.Color).lerp(t.accent, dt * 4); (mat.emissive as THREE.Color).lerp(t.accent, dt * 4); (mat.sheenColor as THREE.Color).lerp(t.accent2, dt * 4);
      (H.uColor.value as THREE.Color).lerp(t.accent2, dt * 4); (H.uColor2.value as THREE.Color).lerp(t.cool, dt * 4); rim.color.lerp(t.cool, dt * 4);
      // The skin follows the mood: every dial eases toward its target.
      const k = Math.min(1, dt * 3.2);
      for (const key of Object.keys(live) as (keyof Skin)[]) live[key] += (want[key] - live[key]) * k;
      U.uSpike.value = live.spike; U.uRough.value = live.rough; U.uDroop.value = live.droop; U.uTremble.value = live.tremble; U.uCrack.value = live.crack;
      U.uSpark.value = live.spark; U.uShimmer.value = live.shimmer; U.uGhost.value = live.ghost; U.uPale.value = live.pale;
      mat.roughness = live.roughness; mat.clearcoat = live.clearcoat; mat.emissiveIntensity = live.emissive;
      H.uI.value = live.halo; H.uSpread.value = live.haloSpread; H.uRays.value = live.haloRays; H.uFlicker.value = live.haloFlicker; H.uDroop.value = live.haloDroop; H.uRing.value = live.haloRing; H.uSparks.value = live.haloSparks; H.uPulse.value = live.pulse;
      tx += (px - tx) * dt * 5; ty += (py - ty) * dt * 5;
      const s = reduced ? 0 : now / 1000;
      U.uTime.value = s; H.uTime.value = s;
      const jitter = reduced ? 0 : live.tremble * 0.02;
      ball.position.set((Math.random() - 0.5) * jitter, Math.sin(s * 0.9) * 0.08 * (1 - live.droop * 0.7) - live.droop * 0.12 + (Math.random() - 0.5) * jitter, 0);
      ball.rotation.set(ty * 0.6, tx * 0.8 + s * live.spin, 0);
      pulse = Math.max(0, pulse - dt * 1.6); const sc = 1 + Math.sin(pulse * Math.PI) * 0.12 + Math.sin(s * live.pulse) * 0.012 * live.pulse; ball.scale.setScalar(sc); halo.scale.setScalar(sc);
      halo.position.set(ball.position.x, ball.position.y, -0.4);
      renderer.render(scene, camera);
      if (rest && now > awakeUntil) { running = false; return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => { renderer.setSize(size(), size()); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); el.removeEventListener("me:orb-pulse", onPulse); ball.geometry.dispose(); mat.dispose(); halo.geometry.dispose(); haloMat.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, []);

  const pick = (x: Palette, el?: HTMLElement) => {
    setP(x); applyPalette(x); host.current?.dispatchEvent(new Event("me:orb-pulse"));
    if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.06) translateY(-3px)" }, { transform: "scale(1)" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
  };
  const words = moodText(p.id, lang);
  return (
    <div className="orb-band">
      <button type="button" className="orb-stage" onClick={() => pick(nextPalette(p))} aria-label={`${p.label}. Tap for the next mood.`}>
        <div ref={host} className="orb-canvas" aria-hidden />
      </button>
      <div className="swatch-frame orb-swatches" role="group" aria-label="Moods and their colours">
        <div className="swatches">
          {PALETTES.map((x) => (
            <button key={x.id} type="button" className={`swatch ${p.id === x.id ? "on" : ""}`} style={{ ["--c" as string]: x.accent }} onClick={(e) => pick(x, e.currentTarget)} aria-pressed={p.id === x.id} aria-label={x.label}>
              <i aria-hidden /><span>{moodText(x.id, lang)?.[0] ?? x.label}</span>
            </button>
          ))}
        </div>
        <div className="label"><span className="emotion">{words?.[0] ?? p.label}</span><span className="muted">{words?.[1] ?? p.hint}</span></div>
      </div>
    </div>
  );
}
