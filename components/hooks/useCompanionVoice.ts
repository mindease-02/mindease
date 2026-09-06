"use client";
/**
 * Speaks companion replies. Provider first (server-side TTS proxy, keys never
 * in the browser), then the browser's own SpeechSynthesis, then silence - and
 * the hook says which one it ended up with so the UI can be honest about it.
 * Exposes a live 0..1 level (from an analyser on the audio element, or a
 * synthetic envelope for the browser voice) that drives the avatar's mouth.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceConfig } from "@/lib/companion/types";
import { voiceById } from "@/lib/companion/voices";

export type VoiceMode = "provider" | "browser" | "text" | "unknown";

export function useCompanionVoice(config: VoiceConfig, providerAvailable: boolean | null) {
  const [speaking, setSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  // Starts "unknown" on both server and client so the first render hydrates cleanly; resolved in an effect.
  const [mode, setMode] = useState<VoiceMode>("unknown");
  const cfg = useRef(config); cfg.current = config;
  const mutedRef = useRef(muted); mutedRef.current = muted;
  const audio = useRef<HTMLAudioElement | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const raf = useRef(0);
  const synthLevel = useRef(0);

  useEffect(() => { setMode(providerAvailable ? "provider" : ("speechSynthesis" in window ? "browser" : "text")); }, [providerAvailable]);

  const stopMeter = useCallback(() => { cancelAnimationFrame(raf.current); setLevel(0); }, []);

  const meter = useCallback(() => {
    const a = analyser.current;
    const buf = a ? new Uint8Array(a.fftSize) : null;
    const tick = () => {
      raf.current = requestAnimationFrame(tick);
      if (a && buf) {
        a.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
      } else {
        setLevel(synthLevel.current);
      }
    };
    tick();
  }, []);

  const stop = useCallback(() => {
    if (audio.current) { audio.current.pause(); audio.current.src = ""; audio.current = null; }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    setSpeaking(false); stopMeter();
  }, [stopMeter]);

  const speakBrowser = useCallback((text: string): boolean => {
    if (!("speechSynthesis" in window)) return false;
    const c = cfg.current; const v = voiceById(c.voiceId);
    const u = new SpeechSynthesisUtterance(text);
    u.rate = c.speed; u.pitch = v.pitch; u.volume = c.volume;
    const re = new RegExp(v.browserHint, "i");
    const voices = speechSynthesis.getVoices();
    const match = voices.find((x) => re.test(x.name)) ?? voices.find((x) => /^en/i.test(x.lang));
    if (match) u.voice = match;
    u.onstart = () => { setSpeaking(true); analyser.current = null; synthLevel.current = 0.5; meter(); };
    u.onboundary = () => { synthLevel.current = 0.35 + Math.random() * 0.5; };
    u.onend = () => { setSpeaking(false); stopMeter(); };
    u.onerror = () => { setSpeaking(false); stopMeter(); };
    speechSynthesis.cancel(); speechSynthesis.speak(u);
    // Decay the synthetic level between word boundaries.
    const decay = setInterval(() => { synthLevel.current *= 0.85; if (!speechSynthesis.speaking) clearInterval(decay); }, 90);
    return true;
  }, [meter, stopMeter]);

  const speak = useCallback(async (text: string): Promise<VoiceMode> => {
    if (mutedRef.current || !text.trim()) return mode;
    stop();
    const c = cfg.current;
    try {
      const r = await fetch("/api/companion/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice: c }) });
      if (r.status === 200) {
        const url = URL.createObjectURL(await r.blob());
        const el = new Audio(url); el.volume = c.volume; el.playbackRate = 1; audio.current = el;
        try {
          ctx.current ??= new AudioContext();
          if (ctx.current.state === "suspended") await ctx.current.resume();
          const src = ctx.current.createMediaElementSource(el);
          const an = ctx.current.createAnalyser(); an.fftSize = 512;
          src.connect(an); an.connect(ctx.current.destination); analyser.current = an;
        } catch { analyser.current = null; }
        el.onplay = () => { setSpeaking(true); meter(); };
        el.onended = () => { setSpeaking(false); stopMeter(); URL.revokeObjectURL(url); };
        el.onerror = () => { setSpeaking(false); stopMeter(); };
        await el.play();
        setMode("provider");
        return "provider";
      }
      if (r.status !== 204) throw new Error(`tts ${r.status}`);
    } catch { /* fall through to the browser voice */ }
    const ok = speakBrowser(text);
    const m: VoiceMode = ok ? "browser" : "text";
    setMode(m);
    return m;
  }, [mode, stop, speakBrowser, meter, stopMeter]);

  useEffect(() => () => { cancelAnimationFrame(raf.current); if (audio.current) audio.current.pause(); if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel(); }, []);

  return { speak, stop, speaking, level, muted, setMuted, mode };
}
