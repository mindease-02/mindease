"use client";
/**
 * Camera → MediaPipe Face Landmarker (blendshapes) → two numbers.
 *
 * Loaded on demand from the CDN only after the person turns the switch on and
 * grants camera access. Runs at ~4 fps while the composer is open, aggregates
 * per message, and sends {valence, arousal, confidence, frames}. Frames are
 * never stored or transmitted.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import type { FaceFeatures } from "@/lib/affect/face";

const MP_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

interface Sample { v: number; a: number; c: number }

/** Blendshape names → a rough valence/arousal. Coefficients are hand-set, deliberately conservative. */
function score(shapes: { categoryName: string; score: number }[]): Sample {
  const g = (n: string) => shapes.find((s) => s.categoryName === n)?.score ?? 0;
  const smile = (g("mouthSmileLeft") + g("mouthSmileRight")) / 2;
  const frown = (g("mouthFrownLeft") + g("mouthFrownRight")) / 2;
  const browDown = (g("browDownLeft") + g("browDownRight")) / 2;
  const cheek = (g("cheekSquintLeft") + g("cheekSquintRight")) / 2;
  const browUp = g("browInnerUp");
  const eyeWide = (g("eyeWideLeft") + g("eyeWideRight")) / 2;
  const jaw = g("jawOpen");
  const press = g("mouthPressLeft") + g("mouthPressRight");
  const v = 1.3 * smile + 0.3 * cheek - 1.1 * frown - 0.6 * browDown - 0.3 * press;
  const a = 0.9 * eyeWide + 0.7 * browUp + 0.5 * jaw + 0.4 * browDown - 0.15;
  return { v: Math.max(-1, Math.min(1, v)), a: Math.max(-1, Math.min(1, a)), c: 1 };
}

export function useFaceAffect() {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const samples = useRef<Sample[]>([]);
  const empty = useRef(0);
  const timer = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const landmarker = useRef<{ detectForVideo: (v: HTMLVideoElement, t: number) => { faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[] }; close: () => void } | null>(null);

  const start = useCallback(async () => {
    try {
      const mod = await import(/* webpackIgnore: true */ `${MP_URL}/vision_bundle.mjs`) as {
        FilesetResolver: { forVisionTasks: (u: string) => Promise<unknown> };
        FaceLandmarker: { createFromOptions: (f: unknown, o: unknown) => Promise<typeof landmarker.current> };
      };
      const fileset = await mod.FilesetResolver.forVisionTasks(`${MP_URL}/wasm`);
      landmarker.current = await mod.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: true,
      });
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: "user" } });
      stream.current = s;
      const el = document.createElement("video");
      el.srcObject = s; el.muted = true; el.playsInline = true;
      await el.play();
      video.current = el;
      samples.current = []; empty.current = 0;
      timer.current = window.setInterval(() => {
        const lm = landmarker.current, v = video.current;
        if (!lm || !v || v.readyState < 2) return;
        const res = lm.detectForVideo(v, performance.now());
        const cats = res.faceBlendshapes?.[0]?.categories;
        if (cats && cats.length) samples.current.push(score(cats)); else empty.current++;
        if (samples.current.length > 240) samples.current.shift();
      }, 250);
      setActive(true); setError(null);
    } catch (err) {
      setError((err as Error).message || "camera unavailable");
      setActive(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null; video.current = null;
    landmarker.current?.close(); landmarker.current = null;
    setActive(false);
  }, []);

  /** Aggregate what was seen since the last message, then reset. */
  const collect = useCallback((): FaceFeatures | undefined => {
    const s = samples.current;
    const frames = s.length;
    const total = frames + empty.current;
    samples.current = []; empty.current = 0;
    if (frames === 0) return undefined;
    const mean = (k: keyof Sample) => s.reduce((acc, x) => acc + x[k], 0) / frames;
    return { valence: mean("v"), arousal: mean("a"), confidence: total ? frames / total : 0, frames };
  }, []);

  return useMemo(() => ({ active, error, start, stop, collect }), [active, error, start, stop, collect]);
}
