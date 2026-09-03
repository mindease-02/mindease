"use client";
/**
 * The ball in "why it exists": a glossy sphere, lit by
 * an HDR room environment. Its colour is exactly the emotion's assigned colour
 * (lib/theme.ts); it eases to the next colour when tapped, squashes on the tap,
 * and drifts with the pointer.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { THEME_EVENT, currentPalette, type Palette } from "@/lib/theme";

export default function Sphere3D({ tapSignal }: { tapSignal: React.MutableRefObject<number> }) {
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
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(30, el.clientWidth / el.clientHeight, 0.1, 30);
    camera.position.set(0, 0.2, 6.6);

    let pal = currentPalette();
    const key = new THREE.DirectionalLight(new THREE.Color(pal.accent2).lerp(new THREE.Color(0xffffff), 0.6), 1.9); key.position.set(2.5, 3, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(pal.cool, 1.3); rim.position.set(-3, 1, -2); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x2a2d38, 1.0));

    const root = new THREE.Group(); root.position.y = 0.2; scene.add(root);
    const mat = new THREE.MeshPhysicalMaterial({ color: pal.accent, metalness: 0.15, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.4, sheenColor: new THREE.Color(pal.accent2), envMapIntensity: 1.1 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.3, 96, 96), mat); root.add(ball);
    const satMat = new THREE.MeshPhysicalMaterial({ color: pal.cool, metalness: 0.2, roughness: 0.15, clearcoat: 1, emissive: new THREE.Color(pal.cool).multiplyScalar(0.25), emissiveIntensity: 0.6 });
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 32), satMat); root.add(sat);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.7; scene.add(shadow);

    // Colour eases toward the assigned colour of the chosen emotion.
    const targetColor = new THREE.Color(pal.accent), targetSheen = new THREE.Color(pal.accent2), targetCool = new THREE.Color(pal.cool);
    const onTheme = (e: Event) => {
      pal = (e as CustomEvent<Palette>).detail;
      targetColor.set(pal.accent); targetSheen.set(pal.accent2); targetCool.set(pal.cool);
    };
    window.addEventListener(THEME_EVENT, onTheme);

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => { pointer.x = (e.clientX / window.innerWidth - 0.5) * 2; pointer.y = (e.clientY / window.innerHeight - 0.5) * 2; };
    window.addEventListener("pointermove", onMove, { passive: true });

    let lastTap = tapSignal.current, squash = 0, squashV = 0;
    const clock = new THREE.Clock();
    const frame = () => {
      if (!running) return;
      const dt = Math.min(0.05, clock.getDelta());
      const t = clock.elapsedTime;
      const k = 1 - Math.pow(0.002, dt);
      mat.color.lerp(targetColor, k); mat.sheenColor.lerp(targetSheen, k);
      satMat.color.lerp(targetCool, k); satMat.emissive.copy(satMat.color).multiplyScalar(0.25);
      rim.color.lerp(targetCool, k); key.color.copy(targetSheen).lerp(new THREE.Color(0xffffff), 0.6);

      if (tapSignal.current !== lastTap) { lastTap = tapSignal.current; squashV = -6; }
      squashV += (-squash * 90 - squashV * 9) * dt; squash += squashV * dt;
      const breath = reduced ? 0 : Math.sin(t * 0.9) * 0.015;
      ball.scale.set(1 + breath - squash * 0.25, 1 - breath + squash * 0.4, 1 + breath - squash * 0.25);
      root.position.y = 0.2 + (reduced ? 0 : Math.sin(t * 0.7) * 0.06);
      root.rotation.y = pointer.x * 0.35 + (reduced ? 0 : t * 0.1);
      root.rotation.x = -pointer.y * 0.2;
      const a = t * 0.5; sat.position.set(Math.cos(a) * 2.05, Math.sin(a * 0.8) * 0.3, Math.sin(a) * 2.05);
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
