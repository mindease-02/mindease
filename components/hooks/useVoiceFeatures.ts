"use client";
/**
 * Voice channel, extracted in the browser.
 *
 * Records with MediaRecorder for transcription and, in parallel, runs a small
 * classical feature extractor over the live signal: autocorrelation pitch,
 * RMS intensity, spectral centroid, voiced/unvoiced framing, pause structure.
 * The audio clip goes to Whisper for words; only the ~10 aggregate numbers go
 * to the prosody channel. No voice embedding is ever computed.
 */
import { useCallback, useRef, useState } from "react";
import type { ProsodyFeatures } from "@/lib/affect/prosody";

interface Frame { t: number; rms: number; f0: number | null; centroid: number }

const FRAME_MS = 50;
const MIN_F0 = 70, MAX_F0 = 400;

function autocorrPitch(buf: Float32Array, sampleRate: number): number | null {
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.012) return null;
  const minLag = Math.floor(sampleRate / MAX_F0), maxLag = Math.floor(sampleRate / MIN_F0);
  let bestLag = -1, best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i < n - lag; i++) c += buf[i] * buf[i + lag];
    if (c > best) { best = c; bestLag = lag; }
  }
  let e = 0;
  for (let i = 0; i < n; i++) e += buf[i] * buf[i];
  if (bestLag < 0 || best / e < 0.35) return null; // not periodic enough to call voiced
  return sampleRate / bestLag;
}

function summarize(frames: Frame[]): ProsodyFeatures {
  const voiced = frames.filter((f) => f.f0 !== null);
  const f0s = voiced.map((f) => f.f0!).sort((a, b) => a - b);
  const q = (arr: number[], p: number) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(p * arr.length))] : 0;
  const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

  // Pause structure: runs of near-silence longer than 250ms.
  const pauses: number[] = [];
  let run = 0;
  for (const f of frames) {
    if (f.rms < 0.008) run += FRAME_MS;
    else { if (run >= 250) pauses.push(run); run = 0; }
  }
  if (run >= 250) pauses.push(run);
  const total = frames.length * FRAME_MS;

  // Jitter: mean absolute cycle-to-cycle F0 change, as % of mean F0.
  let jit = 0, jn = 0;
  for (let i = 1; i < voiced.length; i++) {
    if (voiced[i].t - voiced[i - 1].t <= FRAME_MS * 1.5) { jit += Math.abs(voiced[i].f0! - voiced[i - 1].f0!); jn++; }
  }
  const f0mean = mean(f0s) || 1;

  // Speech rate proxy: voiced onsets per second of non-pause time.
  let onsets = 0;
  for (let i = 1; i < frames.length; i++) if (frames[i].f0 !== null && frames[i - 1].f0 === null) onsets++;
  const speechSec = Math.max(0.1, (total - pauses.reduce((a, b) => a + b, 0)) / 1000);

  const ints = voiced.map((f) => f.rms);
  const im = mean(ints);
  return {
    f0Median: q(f0s, 0.5), f0Iqr: q(f0s, 0.75) - q(f0s, 0.25),
    intensity: Math.min(1, im * 6),
    intensityVar: Math.sqrt(mean(ints.map((x) => (x - im) ** 2))) * 6,
    speechRate: onsets / speechSec,
    pauseRatio: total ? pauses.reduce((a, b) => a + b, 0) / total : 0,
    meanPauseMs: mean(pauses),
    jitter: jn ? (jit / jn) / f0mean * 100 : 0,
    spectralCentroid: mean(voiced.map((f) => f.centroid)),
    voicedSeconds: voiced.length * FRAME_MS / 1000,
  };
}

export function useVoiceFeatures() {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const frames = useRef<Frame[]>([]);
  const timer = useRef<number | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    stream.current = s;
    const ac = new AudioContext();
    ctx.current = ac;
    const src = ac.createMediaStreamSource(s);
    const an = ac.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    const time = new Float32Array(an.fftSize);
    const freq = new Float32Array(an.frequencyBinCount);
    frames.current = [];
    const t0 = performance.now();
    timer.current = window.setInterval(() => {
      an.getFloatTimeDomainData(time);
      an.getFloatFrequencyData(freq);
      let rms = 0;
      for (let i = 0; i < time.length; i++) rms += time[i] * time[i];
      rms = Math.sqrt(rms / time.length);
      let num = 0, den = 0;
      for (let i = 0; i < freq.length; i++) {
        const mag = Math.pow(10, freq[i] / 20);
        num += mag * (i * ac.sampleRate / an.fftSize); den += mag;
      }
      frames.current.push({ t: performance.now() - t0, rms, f0: autocorrPitch(time, ac.sampleRate), centroid: den ? num / den : 0 });
      setLevel(Math.min(1, rms * 8));
    }, FRAME_MS);

    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/mp4";
    const mr = new MediaRecorder(s, { mimeType: mime });
    chunks.current = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    mr.start(250);
    rec.current = mr;
    setRecording(true);
  }, []);

  const stop = useCallback((): Promise<{ audio: Blob; prosody: ProsodyFeatures; mime: string }> => {
    return new Promise((resolve) => {
      const mr = rec.current;
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
      const finish = () => {
        const mime = mr?.mimeType ?? "audio/webm";
        const audio = new Blob(chunks.current, { type: mime });
        stream.current?.getTracks().forEach((t) => t.stop());
        ctx.current?.close().catch(() => {});
        setRecording(false); setLevel(0);
        resolve({ audio, prosody: summarize(frames.current), mime });
      };
      if (mr && mr.state !== "inactive") { mr.onstop = finish; mr.stop(); } else finish();
    });
  }, []);

  return { recording, level, start, stop };
}
