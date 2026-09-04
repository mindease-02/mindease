"use client";
/**
 * The hero centerpiece: a glossy "presence" - a sphere with a thin orbital
 * ring and three satellites - lit by an HDR room environment for real
 * reflections, casting a soft contact shadow, drifting with the pointer.
 *
 * Loaded lazily (next/dynamic, ssr:false) and only rendered while the hero is
 * on screen. Pixel ratio is capped and the loop pauses when hidden. Callers
 * fall back to a CSS orb on small screens, without WebGL, or with
 * prefers-reduced-motion.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { THEME_EVENT, currentPalette, type Palette } from "@/lib/theme";

export interface Drag { active: boolean; vx: number; vy: number }

export default function Scene3D({ pointer, drag, lite = false }: { pointer: React.MutableRefObject<{ x: number; y: number }>; drag: React.MutableRefObject<Drag>; lite?: boolean }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let raf = 0, running = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.25 : 1.5));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !lite;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Opaque, graded ground so bloom has something to composite onto; the canvas
    // edges are masked in CSS so the frame dissolves into the page's atmosphere.
    const pal0 = currentPalette();
    scene.background = new THREE.Color(pal0.bg2);
    scene.fog = new THREE.FogExp2(pal0.bg2, 0.035);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 0.1, 50);
    const DOLLY_FROM = 10.5, DOLLY_TO = 7.2, DOLLY_MS = 2600;
    camera.position.set(0, 0.35, DOLLY_FROM);

    // Post: a restrained bloom so the clearcoat highlight and the ring's rim read
    // as light, not as texture. Threshold high enough that the body stays matte.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    if (!lite) composer.addPass(new UnrealBloomPass(new THREE.Vector2(el.clientWidth, el.clientHeight), 0.42, 0.65, 0.82));
    composer.addPass(new OutputPass());

    // Lighting: warm key, cool rim, soft fill. The environment does the reflections.
    const key = new THREE.DirectionalLight(new THREE.Color(pal0.accent2).lerp(new THREE.Color(0xffffff), 0.6), 2.2);
    key.position.set(3, 4, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(pal0.cool, 1.6); rim.position.set(-4, 1.5, -3); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x1b1e2a, 1.2));

    const group = new THREE.Group(); scene.add(group);

    const coral = new THREE.MeshPhysicalMaterial({
      color: pal0.accent, metalness: 0.15, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08,
      sheen: 0.4, sheenColor: new THREE.Color(pal0.accent2), envMapIntensity: 1.1,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.35, 96, 96), coral);
    core.castShadow = true; group.add(core);

    const ringMat = new THREE.MeshPhysicalMaterial({ color: 0xcfd8de, metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.035, 24, 220), ringMat);
    ring.rotation.x = Math.PI / 2.35; ring.castShadow = true; group.add(ring);

    const satMat = new THREE.MeshPhysicalMaterial({ color: pal0.cool, metalness: 0.2, roughness: 0.15, clearcoat: 1, emissive: new THREE.Color(pal0.cool).multiplyScalar(0.25), emissiveIntensity: 0.6 });

    // Follow the site palette when the orb in "why it exists" changes it.
    const onTheme = (e: Event) => {
      const pal = (e as CustomEvent<Palette>).detail;
      coral.color.set(pal.accent); coral.sheenColor.set(pal.accent2);
      satMat.color.set(pal.cool); satMat.emissive.set(pal.cool).multiplyScalar(0.25);
      rim.color.set(pal.cool); key.color.set(pal.accent2).lerp(new THREE.Color(0xffffff), 0.6);
      (scene.background as THREE.Color).set(pal.bg2); (scene.fog as THREE.FogExp2).color.set(pal.bg2);
    };
    window.addEventListener(THEME_EVENT, onTheme);
    const sats: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.11 + i * 0.03, 32, 32), satMat);
      s.castShadow = true; group.add(s); sats.push(s);
    }

    // Contact shadow on an invisible floor.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.42 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -2.15; floor.receiveShadow = true; scene.add(floor);

    // Ambient particles.
    const N = lite ? 120 : 220;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = (Math.random() - 0.5) * 8; pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1; }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.025, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(particles);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: 0, y: 0 }; const cur = { x: 0, y: 0 };
    let spinY = 0, spinX = 0; // drag-driven rotation with inertia
    const clock = new THREE.Clock();
    const started = performance.now();
    const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

    const frame = () => {
      if (!running) return;
      const t = clock.getElapsedTime();
      target.x = pointer.current.x; target.y = pointer.current.y;
      cur.x += (target.x - cur.x) * 0.05; cur.y += (target.y - cur.y) * 0.05;
      // Drag: while touching, velocity feeds the spin directly; on release it decays.
      const d = drag.current;
      if (d.active) { spinY += d.vx * 0.012; spinX += d.vy * 0.008; d.vx *= 0.6; d.vy *= 0.6; }
      else { spinY *= 0.985; spinX *= 0.985; }
      group.rotation.y = cur.x * 0.45 + (reduced ? 0 : t * 0.08) + spinY;
      group.rotation.x = Math.max(-0.9, Math.min(0.9, -cur.y * 0.3 + spinX));
      group.position.y = reduced ? 0 : Math.sin(t * 0.6) * 0.12;
      ring.rotation.z = reduced ? 0 : t * 0.12;
      sats.forEach((s, i) => {
        const a = t * (0.35 + i * 0.12) + i * 2.1;
        s.position.set(Math.cos(a) * 2.25, Math.sin(a * 0.7) * 0.5, Math.sin(a) * 2.25);
      });
      particles.rotation.y = t * 0.02;
      // Opening dolly: the camera settles into the shot over the first seconds.
      const dolly = reduced ? 1 : easeOut(Math.min(1, (performance.now() - started) / DOLLY_MS));
      const z = DOLLY_FROM + (DOLLY_TO - DOLLY_FROM) * dolly;
      camera.position.x += (cur.x * 0.6 - camera.position.x) * 0.04;
      camera.position.y += (0.35 + cur.y * 0.35 - camera.position.y) * 0.04;
      camera.position.z = z + (reduced ? 0 : Math.sin(t * 0.25) * 0.08);
      camera.lookAt(0, 0, 0);
      composer.render();
      raf = requestAnimationFrame(frame);
    };
    frame();

    const onResize = () => { renderer.setSize(el.clientWidth, el.clientHeight); composer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(el);
    const io = new IntersectionObserver(([e]) => { running = e.isIntersecting && !document.hidden; if (running) { clock.start(); frame(); } });
    io.observe(el);
    const onVis = () => { running = !document.hidden; if (running) frame(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(THEME_EVENT, onTheme);
      pmrem.dispose(); composer.dispose(); renderer.dispose(); el.removeChild(renderer.domElement);
      [core, ring, ...sats, floor].forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      pGeo.dispose();
    };
  }, [pointer, drag, lite]);

  return <div ref={host} className="absolute inset-0 scene-mask" aria-hidden />;
}
