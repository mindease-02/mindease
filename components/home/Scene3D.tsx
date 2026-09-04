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
/** Story state driven by the Experience: how assembled the ball is (0 = scattered voxels, 1 = solid sphere) and which formation the voxels take. */
export interface Story { assemble: number; formation: number; scatter: number }

export default function Scene3D({ pointer, drag, lite = false, story }: { pointer: React.MutableRefObject<{ x: number; y: number }>; drag: React.MutableRefObject<Drag>; lite?: boolean; story?: React.MutableRefObject<Story> }) {
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
    const DOLLY_FROM = lite ? 12.5 : 10.5, DOLLY_TO = lite ? 9.4 : 7.2, DOLLY_MS = 2600;
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
      coral.color.set(pal.accent); coral.sheenColor.set(pal.accent2); (vox.material as THREE.MeshPhysicalMaterial).color.set(pal.accent);
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

    // Voxels: the ball is made of little parts. Each has a scattered start and a
    // target on the sphere; formations re-target them (sphere / ring / cloud / spiral).
    const N_VOX = lite ? 420 : 900;
    const vox = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), new THREE.MeshPhysicalMaterial({ color: pal0.accent, roughness: 0.35, metalness: 0.1, clearcoat: 0.6 }), N_VOX);
    vox.castShadow = false; group.add(vox);
    const start = new Float32Array(N_VOX * 3), targ = new Float32Array(N_VOX * 3), form = new Float32Array(N_VOX * 3);
    const rnd = (seed: number) => { let x = Math.sin(seed * 9999) * 10000; return x - Math.floor(x); };
    for (let i = 0; i < N_VOX; i++) {
      // fibonacci sphere targets at radius 1.42 (just outside the body)
      const k = i + 0.5, phi = Math.acos(1 - 2 * k / N_VOX), th = Math.PI * (1 + Math.sqrt(5)) * k;
      targ[i * 3] = 1.42 * Math.cos(th) * Math.sin(phi); targ[i * 3 + 1] = 1.42 * Math.cos(phi); targ[i * 3 + 2] = 1.42 * Math.sin(th) * Math.sin(phi);
      const r = 5 + rnd(i) * 7, a = rnd(i + 1) * Math.PI * 2, b = (rnd(i + 2) - 0.5) * Math.PI;
      start[i * 3] = r * Math.cos(a) * Math.cos(b); start[i * 3 + 1] = r * Math.sin(b); start[i * 3 + 2] = r * Math.sin(a) * Math.cos(b) - 2;
    }
    const formations = [
      (i: number, o: Float32Array) => { o[0] = targ[i * 3]; o[1] = targ[i * 3 + 1]; o[2] = targ[i * 3 + 2]; },
      (i: number, o: Float32Array) => { const a = (i / N_VOX) * Math.PI * 2, R = 2.4 + (rnd(i) - 0.5) * 0.25; o[0] = Math.cos(a) * R; o[1] = (rnd(i + 3) - 0.5) * 0.3; o[2] = Math.sin(a) * R; },
      (i: number, o: Float32Array) => { o[0] = targ[i * 3] * 2.6; o[1] = targ[i * 3 + 1] * 2.6; o[2] = targ[i * 3 + 2] * 2.6; },
      (i: number, o: Float32Array) => { const t = i / N_VOX, a = t * Math.PI * 10; const R = 0.6 + t * 2.2; o[0] = Math.cos(a) * R; o[1] = (t - 0.5) * 3.2; o[2] = Math.sin(a) * R; },
    ];
    const tmp = new Float32Array(3), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), vpos = new THREE.Vector3();
    const AXIS = new THREE.Vector3(0.3, 1, 0.2).normalize();
    const sm = { assemble: 0, scatter: 0 }; // smoothed story values so scroll never jerks the parts
    let curForm = -1, frameNo = 0, lastT = 0;
    const vcur = new Float32Array(N_VOX * 3); vcur.set(start);
    const bodyMat = coral as THREE.MeshPhysicalMaterial; bodyMat.transparent = true;

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

      // Assembly: lerp every voxel from where it is toward its formation target, jittered by the story's scatter.
      const raw = story?.current ?? { assemble: 1, formation: 0, scatter: 0 };
      // Time-based smoothing (independent of frame rate): ~0.25s to settle.
      const dtS = Math.min(0.1, Math.max(0.001, t - lastT)); lastT = t;
      const kS = 1 - Math.exp(-dtS * 7);
      sm.assemble += (raw.assemble - sm.assemble) * kS; sm.scatter += (raw.scatter - sm.scatter) * kS;
      const st = { assemble: sm.assemble, scatter: sm.scatter, formation: raw.formation };
      const settled = st.formation === 0 && sm.assemble > 0.999 && sm.scatter < 0.002;
      frameNo++;
      if (st.formation !== curForm) { curForm = st.formation; for (let i = 0; i < N_VOX; i++) { formations[curForm % formations.length](i, tmp); form[i * 3] = tmp[0]; form[i * 3 + 1] = tmp[1]; form[i * 3 + 2] = tmp[2]; } }
      const k = reduced ? 1 : 1 - Math.exp(-dtS * 5);
      if (!settled || frameNo % 3 === 0) for (let i = 0; i < N_VOX; i++) {
        const j = i * 3, sctr = st.scatter * (0.35 + rnd(i + 7) * 0.8);
        const tx = form[j] * (1 + sctr) + Math.sin(t * 0.9 + i) * 0.03 * st.scatter * 4, ty = form[j + 1] * (1 + sctr) + Math.cos(t * 0.7 + i * 1.3) * 0.03, tz = form[j + 2] * (1 + sctr);
        const mix = reduced ? 1 : st.assemble;
        const gx = start[j] + (tx - start[j]) * mix, gy = start[j + 1] + (ty - start[j + 1]) * mix, gz = start[j + 2] + (tz - start[j + 2]) * mix;
        vcur[j] += (gx - vcur[j]) * k; vcur[j + 1] += (gy - vcur[j + 1]) * k; vcur[j + 2] += (gz - vcur[j + 2]) * k;
        vpos.set(vcur[j], vcur[j + 1], vcur[j + 2]);
        const s = 0.6 + 0.6 * (1 - Math.min(1, st.assemble)) + (st.formation === 0 ? 0 : 0.3);
        sc.setScalar(s); q.setFromAxisAngle(AXIS, t * 0.4 + i);
        m4.compose(vpos, q, sc); vox.setMatrixAt(i, m4);
      }
      vox.instanceMatrix.needsUpdate = true;
      // The solid body only shows once the parts have arrived; the ring follows.
      const solid = st.formation === 0 ? Math.max(0, Math.min(1, (st.assemble - 0.75) / 0.25)) : 0;
      bodyMat.opacity = solid; core.visible = solid > 0.02; ring.visible = solid > 0.5;
      (ring.material as THREE.MeshPhysicalMaterial).transparent = true; (ring.material as THREE.MeshPhysicalMaterial).opacity = solid;
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
      [core, ring, ...sats, floor, vox].forEach((m) => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      pGeo.dispose();
    };
  }, [pointer, drag, lite, story]);

  return <div ref={host} className="absolute inset-0 scene-mask" aria-hidden />;
}
