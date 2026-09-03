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

export default function Scene3D({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let raf = 0, running = true;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(32, el.clientWidth / el.clientHeight, 0.1, 50);
    camera.position.set(0, 0.35, 7.2);

    // Lighting: warm key, cool rim, soft fill. The environment does the reflections.
    const key = new THREE.DirectionalLight(0xffd7c2, 2.2);
    key.position.set(3, 4, 3); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fd0e0, 1.6); rim.position.set(-4, 1.5, -3); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x1b1e2a, 1.2));

    const group = new THREE.Group(); scene.add(group);

    const coral = new THREE.MeshPhysicalMaterial({
      color: 0xf0876a, metalness: 0.15, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08,
      sheen: 0.4, sheenColor: new THREE.Color(0xffb59a), envMapIntensity: 1.1,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.35, 96, 96), coral);
    core.castShadow = true; group.add(core);

    const ringMat = new THREE.MeshPhysicalMaterial({ color: 0xcfd8de, metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.035, 24, 220), ringMat);
    ring.rotation.x = Math.PI / 2.35; ring.castShadow = true; group.add(ring);

    const satMat = new THREE.MeshPhysicalMaterial({ color: 0x7fd0e0, metalness: 0.2, roughness: 0.15, clearcoat: 1, emissive: 0x0e2a30, emissiveIntensity: 0.6 });
    const sats: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.11 + i * 0.03, 32, 32), satMat);
      s.castShadow = true; group.add(s); sats.push(s);
    }

    // Contact shadow on an invisible floor.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.42 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -2.15; floor.receiveShadow = true; scene.add(floor);

    // Ambient particles.
    const N = 220;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = (Math.random() - 0.5) * 8; pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1; }
    const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.025, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(particles);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: 0, y: 0 }; const cur = { x: 0, y: 0 };
    const clock = new THREE.Clock();

    const frame = () => {
      if (!running) return;
      const t = clock.getElapsedTime();
      target.x = pointer.current.x; target.y = pointer.current.y;
      cur.x += (target.x - cur.x) * 0.05; cur.y += (target.y - cur.y) * 0.05;
      group.rotation.y = cur.x * 0.45 + (reduced ? 0 : t * 0.08);
      group.rotation.x = -cur.y * 0.3;
      group.position.y = reduced ? 0 : Math.sin(t * 0.6) * 0.12;
      ring.rotation.z = reduced ? 0 : t * 0.12;
      sats.forEach((s, i) => {
        const a = t * (0.35 + i * 0.12) + i * 2.1;
        s.position.set(Math.cos(a) * 2.25, Math.sin(a * 0.7) * 0.5, Math.sin(a) * 2.25);
      });
      particles.rotation.y = t * 0.02;
      camera.position.x += (cur.x * 0.6 - camera.position.x) * 0.04;
      camera.position.y += (0.35 + cur.y * 0.35 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    frame();

    const onResize = () => { renderer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(el);
    const io = new IntersectionObserver(([e]) => { running = e.isIntersecting && !document.hidden; if (running) { clock.start(); frame(); } });
    io.observe(el);
    const onVis = () => { running = !document.hidden; if (running) frame(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      pmrem.dispose(); renderer.dispose(); el.removeChild(renderer.domElement);
      [core, ring, ...sats, floor].forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      pGeo.dispose();
    };
  }, [pointer]);

  return <div ref={host} className="absolute inset-0" aria-hidden />;
}
