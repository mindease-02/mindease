"use client";
/**
 * Ori as a character. A soft, glossy body with eyes, brows and a mouth - enough
 * to carry an expression, deliberately not enough to be a face you could mistake
 * for a person. Expression parameters come from the palette (lib/theme.ts) and
 * are eased toward on every frame; eyes track the pointer; it blinks, breathes,
 * and squashes when tapped.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { THEME_EVENT, currentPalette, type Face, type Palette } from "@/lib/theme";

export default function Character3D({ tapSignal }: { tapSignal: React.MutableRefObject<number> }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current; if (!el) return;
    let raf = 0, running = true;
    const small = window.matchMedia("(max-width: 720px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.25 : 1.6));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(30, el.clientWidth / el.clientHeight, 0.1, 30);
    camera.position.set(0, 0.1, 7.6);

    let pal = currentPalette();
    const key = new THREE.DirectionalLight(new THREE.Color(pal.accent2).lerp(new THREE.Color(0xffffff), 0.6), 1.8); key.position.set(2.5, 3, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(pal.cool, 1.2); rim.position.set(-3, 1, -2); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x2a2d38, 1.1));

    const root = new THREE.Group(); scene.add(root);
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: pal.accent, metalness: 0.05, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.5, sheenColor: new THREE.Color(pal.accent2), envMapIntensity: 1.0 });
    const R = 1.35, SY = 1.08;
    const body = new THREE.Mesh(new THREE.SphereGeometry(R, 80, 80), bodyMat);
    body.scale.set(1, SY, 1); root.add(body);
    root.position.y = 0.15;
    /** z on the body's surface at (x, y), plus a lift, so features sit on the skin rather than inside it. */
    const surf = (x: number, y: number, lift = 0.04) => Math.sqrt(Math.max(0.01, R * R - x * x - (y / SY) * (y / SY))) + lift;

    // Face group sits on the front of the body.
    const face = new THREE.Group(); root.add(face);
    const white = new THREE.MeshPhysicalMaterial({ color: 0xf6f3ee, roughness: 0.35, clearcoat: 0.6 });
    const dark = new THREE.MeshPhysicalMaterial({ color: 0x14131a, roughness: 0.3, clearcoat: 1 });
    const eyes: THREE.Group[] = [];
    const pupils: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(sx * 0.46, 0.22, surf(0.46, 0.22, 0.02));
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), white); g.add(e);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 24), dark); p.position.z = 0.15; g.add(p); pupils.push(p);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), white); shine.position.set(0.04, 0.05, 0.235); g.add(shine);
      face.add(g); eyes.push(g);
    }
    const brows: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.3, 6, 12), dark);
      b.rotation.z = Math.PI / 2; b.position.set(sx * 0.46, 0.58, surf(0.46, 0.58, 0.06));
      const holder = new THREE.Group(); holder.position.copy(b.position); b.position.set(0, 0, 0); holder.add(b); face.add(holder); brows.push(holder as unknown as THREE.Mesh);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 12, 48, Math.PI), dark);
    mouth.position.set(0, -0.32, surf(0.2, -0.4, 0.06)); face.add(mouth);
    const mouthFlat = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.5, 6, 12), dark);
    mouthFlat.rotation.z = Math.PI / 2; mouthFlat.position.set(0, -0.32, surf(0.2, -0.32, 0.06)); face.add(mouthFlat);

    // Contact shadow.
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.75; scene.add(shadow);

    // Expression state, eased toward the palette's target.
    const cur: Face = { ...pal.face };
    let target: Face = { ...pal.face };
    const onTheme = (e: Event) => {
      pal = (e as CustomEvent<Palette>).detail; target = { ...pal.face };
      bodyMat.color.set(pal.accent); bodyMat.sheenColor.set(pal.accent2);
      rim.color.set(pal.cool); key.color.set(pal.accent2).lerp(new THREE.Color(0xffffff), 0.6);
    };
    window.addEventListener(THEME_EVENT, onTheme);

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => { pointer.x = (e.clientX / window.innerWidth - 0.5) * 2; pointer.y = (e.clientY / window.innerHeight - 0.5) * 2; };
    window.addEventListener("pointermove", onMove, { passive: true });

    let lastTap = tapSignal.current, squash = 0, squashV = 0;
    let nextBlink = 2 + Math.random() * 3, blink = 0;
    const clock = new THREE.Clock();
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

    const frame = () => {
      if (!running) return;
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      for (const k of Object.keys(cur) as (keyof Face)[]) cur[k] = lerp(cur[k], target[k], 1 - Math.pow(0.001, dt));

      // Tap: squash and spring.
      if (tapSignal.current !== lastTap) { lastTap = tapSignal.current; squashV = -6; }
      squashV += (-squash * 90 - squashV * 9) * dt; squash += squashV * dt;

      const breath = reduced ? 0 : Math.sin(t * (1.2 + cur.energy * 1.6)) * (0.015 + cur.energy * 0.02);
      const trem = reduced ? 0 : cur.tremor * 0.012 * Math.sin(t * 38);
      body.scale.set(1 + breath * 0.6 - squash * 0.25, 1.08 - breath + squash * 0.4, 1 + breath * 0.6 - squash * 0.25);
      root.position.y = 0.15 + (reduced ? 0 : Math.sin(t * 0.9) * 0.05 * (0.5 + cur.energy)) + (cur.droop < 0 ? -cur.droop * 0.1 * Math.abs(Math.sin(t * 3)) : 0) - cur.droop * 0.12;
      root.rotation.x = cur.droop * 0.18 + trem;
      root.rotation.y = pointer.x * 0.22 + trem * 0.5;
      root.rotation.z = trem * 0.6 + (reduced ? 0 : Math.sin(t * 0.7) * 0.02);

      // Eyes: openness + blink, pupils track the pointer.
      nextBlink -= dt;
      if (nextBlink <= 0 && !reduced) { blink = 0.16; nextBlink = 2.5 + Math.random() * 3.5; }
      const blinkK = blink > 0 ? (blink -= dt, 0.08) : 1;
      const open = Math.max(0.08, cur.eyeOpen) * blinkK;
      for (const g of eyes) g.scale.set(1, open, 1);
      for (const p of pupils) p.position.set(pointer.x * 0.07, -pointer.y * 0.05, 0.15);

      // Brows: inner ends down for anger, up for worry.
      brows[0].rotation.z = cur.brow * 0.5; brows[1].rotation.z = -cur.brow * 0.5;
      brows.forEach((b) => { b.position.y = 0.58 - Math.abs(cur.brow) * 0.06 + (cur.eyeOpen - 0.7) * 0.08; b.position.z = surf(0.46, b.position.y, 0.06); });

      // Mouth: arc for smile/frown, flat capsule near neutral.
      const sm = cur.smile;
      const arc = Math.abs(sm);
      mouth.visible = arc > 0.12; mouthFlat.visible = arc <= 0.12;
      mouth.rotation.z = sm > 0 ? Math.PI : 0;
      mouth.scale.set(0.7 + arc * 0.5, Math.max(0.15, arc), 1);
      mouth.position.y = -0.32 + (sm > 0 ? 0.12 * arc : -0.02 * arc);
      mouth.position.z = surf(0.25, mouth.position.y - 0.2, 0.08);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    frame();

    const ro = new ResizeObserver(() => { renderer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { running = e.isIntersecting && !document.hidden; if (running) { clock.getDelta(); frame(); } });
    io.observe(el);
    const onVis = () => { running = !document.hidden; if (running) frame(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis); window.removeEventListener(THEME_EVENT, onTheme); window.removeEventListener("pointermove", onMove);
      pmrem.dispose(); renderer.dispose(); el.removeChild(renderer.domElement);
      scene.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
    };
  }, [tapSignal]);

  return <div ref={host} className="absolute inset-0" aria-hidden />;
}
