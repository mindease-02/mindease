"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { applyPalette, currentPalette, nextPalette, PALETTES, type Palette } from "@/lib/theme";
import { moodText } from "@/lib/i18n";

/**
 * The colour-changing ball, kept and improved: a glossy 3D sphere that takes
 * the colour of the mood you pick, floats, follows the pointer, and turns
 * the whole site that colour. Tap the ball to move to the next mood; tap a
 * swatch to pick one. The same eight moods the chat asks about on arrival.
 *
 * Phones get a lighter sphere. If frames stay slow the pixel ratio drops to 1
 * and the ball stops floating on its own: it is drawn for a moment after a
 * tap or a pointer move, then rests.
 */
export default function MoodOrb({ lang }: { lang: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [p, setP] = useState<Palette>(PALETTES[0]);
  const target = useRef({ accent: new THREE.Color(PALETTES[0].accent), accent2: new THREE.Color(PALETTES[0].accent2), cool: new THREE.Color(PALETTES[0].cool) });

  useEffect(() => { const c = currentPalette(); setP(c); }, []);
  useEffect(() => { target.current = { accent: new THREE.Color(p.accent), accent2: new THREE.Color(p.accent2), cool: new THREE.Color(p.cool) }; }, [p]);

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
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20); camera.position.set(0, 0, 6);

    const mat = new THREE.MeshPhysicalMaterial({ color: target.current.accent, roughness: 0.25, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.6, sheenColor: target.current.accent2, emissive: target.current.accent, emissiveIntensity: 0.18 });
    const seg = phone ? 48 : 96;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.15, seg, seg), mat); scene.add(ball);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.42, seg / 2, seg / 2), new THREE.MeshBasicMaterial({ color: target.current.accent2, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false })); scene.add(halo);
    const ringGeo = new THREE.TorusGeometry(1.75, 0.012, 8, 160);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: target.current.cool, transparent: true, opacity: 0.7 })); ring.rotation.x = Math.PI / 2.4; scene.add(ring);
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
      const t = target.current;
      (mat.color as THREE.Color).lerp(t.accent, dt * 4); (mat.emissive as THREE.Color).lerp(t.accent, dt * 4); (mat.sheenColor as THREE.Color).lerp(t.accent2, dt * 4);
      (halo.material as THREE.MeshBasicMaterial).color.lerp(t.accent2, dt * 4); (ring.material as THREE.MeshBasicMaterial).color.lerp(t.cool, dt * 4); rim.color.lerp(t.cool, dt * 4);
      tx += (px - tx) * dt * 5; ty += (py - ty) * dt * 5;
      const s = reduced ? 0 : now / 1000;
      ball.position.y = Math.sin(s * 0.9) * 0.08; ball.rotation.set(ty * 0.6, tx * 0.8 + s * 0.15, 0);
      pulse = Math.max(0, pulse - dt * 1.6); const sc = 1 + Math.sin(pulse * Math.PI) * 0.12; ball.scale.setScalar(sc); halo.scale.setScalar(sc * (1 + Math.sin(s * 1.3) * 0.03));
      ring.rotation.z = s * 0.35; ring.rotation.x = Math.PI / 2.4 + ty * 0.3;
      renderer.render(scene, camera);
      if (rest && now > awakeUntil) { running = false; return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onResize = () => { renderer.setSize(size(), size()); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); el.removeEventListener("me:orb-pulse", onPulse); ball.geometry.dispose(); mat.dispose(); ringGeo.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, []);

  const pick = (x: Palette) => { setP(x); applyPalette(x); host.current?.dispatchEvent(new Event("me:orb-pulse")); };
  const words = moodText(p.id, lang);
  return (
    <div className="orb-band">
      <button type="button" className="orb-stage" onClick={() => pick(nextPalette(p))} aria-label={`${p.label}. Tap for the next mood.`}>
        <div ref={host} className="orb-canvas" aria-hidden />
      </button>
      <div className="swatch-frame orb-swatches" role="group" aria-label="Moods and their colours">
        <div className="swatches">
          {PALETTES.map((x) => (
            <button key={x.id} type="button" className={`swatch ${p.id === x.id ? "on" : ""}`} style={{ ["--c" as string]: x.accent }} onClick={() => pick(x)} aria-pressed={p.id === x.id} aria-label={x.label}>
              <i aria-hidden /><span>{moodText(x.id, lang)?.[0] ?? x.label}</span>
            </button>
          ))}
        </div>
        <div className="label"><span className="emotion">{words?.[0] ?? p.label}</span><span className="muted">{words?.[1] ?? p.hint}</span></div>
      </div>
    </div>
  );
}
