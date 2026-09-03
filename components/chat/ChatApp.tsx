"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Orb from "../Orb";
import CrisisCard from "./CrisisCard";
import MirrorPanel from "./MirrorPanel";
import { useTypingMetrics } from "../hooks/useTypingMetrics";
import { useVoiceFeatures } from "../hooks/useVoiceFeatures";
import { useFaceAffect } from "../hooks/useFaceAffect";
import { usePush } from "../hooks/usePush";
import type { MirrorView } from "@/lib/pipeline/mirror";
import type { TurnResult } from "@/lib/pipeline/turn";
import type { ProsodyFeatures } from "@/lib/affect/prosody";
import type { Helpline } from "@/lib/safety/resources";

interface Msg { role: "user" | "assistant"; content: string; at: number; proactive?: boolean; kind?: string; pending?: boolean }

const POLL_MS = 45_000;

function greeting(name: string, a: { label: string; note?: string } | null): string {
  if (!a) return `Hey ${name}. I'm Ori — software, I'll say that once so it's said. What's today been like?`;
  const by: Record<string, string> = {
    Heavy: `Heavy, then. Okay. You don't have to explain it yet — what's the heaviest bit right now?`,
    Anxious: `Anxious. Alright, let's slow it down a notch. What's the thing your head keeps going back to?`,
    Lonely: `Lonely. I'm glad you came here instead of sitting with it. Who's the person you'd have told, if you could?`,
    Numb: `Numb is a real one, and hard to describe. When did the colour start going out of things — today, or a while back?`,
    Angry: `Angry. Fair enough — go on, then. Who or what?`,
    Restless: `Restless. Like you need to do something and can't work out what. What's the nearest thing you've been avoiding?`,
    Okay: `Okay is good, honestly. What's had your attention today?`,
    Hopeful: `Hopeful — that's nice to hear. What shifted?`,
  };
  const line = by[a.label] ?? `You said “${a.label}”. Tell me about that.`;
  return a.note ? `${line} You also mentioned “${a.note}” — start wherever you like.` : line;
}
const SELF_EVAL_MS = 10 * 60_000;

export default function ChatApp({ name }: { name: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mirror, setMirror] = useState<MirrorView | null>(null);
  const [showMirror, setShowMirror] = useState(false);
  const [crisis, setCrisis] = useState<{ helplines: Helpline[]; emergency: string } | null>(null);
  const [tint, setTint] = useState<{ warm: number; cool: number; dim: number }>({ warm: 0.5, cool: 0.3, dim: 0 });
  const [speak, setSpeak] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<ProsodyFeatures | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typing = useTypingMetrics();
  const voice = useVoiceFeatures();
  const face = useFaceAffect();
  const push = usePush();
  const tz = useRef(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const scroll = useCallback(() => { requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })); }, []);

  const refresh = useCallback(async (withMirror: boolean) => {
    try {
      const r = await fetch(`/api/state?tz=${encodeURIComponent(tz.current)}${withMirror ? "&mirror=1" : ""}`, { cache: "no-store" });
      if (r.status === 401) { router.push("/login"); return; }
      const j = await r.json();
      if (j.mirror) setMirror(j.mirror);
      if (Array.isArray(j.outbox) && j.outbox.length) {
        setMessages((m) => [...m, ...j.outbox]);
        typing.onPromptShown();
        scroll();
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          new Notification("Ori", { body: j.outbox[j.outbox.length - 1].content.slice(0, 120) });
        }
        if (speak) say(j.outbox[j.outbox.length - 1].content);
      }
      return j;
    } catch { /* offline; try again next tick */ }
  }, [router, scroll, typing, speak]);

  // Boot: load stored transcript + mirror, then poll for unprompted messages and
  // run the client-side scheduler (so check-ins work even without cron/KV).
  useEffect(() => {
    (async () => {
      const j = await refresh(true);
      const a = j?.arrival as { label: string; note?: string } | null;
      if (j?.messages?.length) { setMessages(j.messages); scroll(); }
      else setMessages([{ role: "assistant", content: greeting(name, a), at: Date.now() }]);
    })();
    const poll = setInterval(() => refresh(false), POLL_MS);
    const evaluate = async () => { try { await fetch("/api/checkin/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); await refresh(false); } catch { /* ignore */ } };
    const sched = setInterval(evaluate, SELF_EVAL_MS);
    const t = setTimeout(evaluate, 8_000);
    return () => { clearInterval(poll); clearInterval(sched); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (showMirror) refresh(true); }, [showMirror, refresh]);

  // Camera follows the consent switch; the model is only downloaded once it is on.
  const faceConsent = mirror?.consent.faceSignals ?? false;
  useEffect(() => {
    if (faceConsent && !face.active) face.start();
    if (!faceConsent && face.active) face.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceConsent]);
  useEffect(() => { if (face.error) setToast(`Camera: ${face.error}`); }, [face.error]);

  async function say(text: string) {
    try {
      const r = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (r.status === 200) { const url = URL.createObjectURL(await r.blob()); new Audio(url).play().catch(() => {}); return; }
    } catch { /* fall through */ }
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.0;
      const v = speechSynthesis.getVoices().find((x) => /samantha|karen|moira|female|serena/i.test(x.name));
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }
  }

  async function send(textOverride?: string, prosody?: ProsodyFeatures) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    const typingFeatures = typing.finish(text.length);
    const faceFeatures = face.active ? face.collect() : undefined;
    setInput("");
    setVoiceNote(null);
    const at = Date.now();
    setMessages((m) => [...m, { role: "user", content: text, at }, { role: "assistant", content: "", at: at + 1, pending: true }]);
    setSending(true); scroll();
    try {
      const clientContext = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, timeZone: tz.current, prosody: prosody ?? voiceNote ?? undefined, typing: typingFeatures, face: faceFeatures, clientContext }),
      });
      if (r.status === 401) { router.push("/login"); return; }
      const j = (await r.json()) as TurnResult & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "something went wrong");
      setMessages((m) => m.map((x) => x.pending ? { role: "assistant", content: j.reply, at: j.at } : x));
      typing.onPromptShown();
      if (j.helplines) setCrisis({ helplines: j.helplines, emergency: j.emergency });
      else if (crisis && j.risk.tier === "none" && /\b(ok|okay|fine|better|safe)\b/i.test(text)) setCrisis(null);
      const a = j.analysis.axes;
      setTint({ warm: Math.min(1, a.joy * 0.7 + a.trust * 0.5 + a.anticipation * 0.3), cool: Math.min(1, a.sadness * 0.6 + a.fear * 0.5), dim: Math.min(1, (a.sadness + a.disgust) * 0.5) });
      if (speak) say(j.reply);
      if (showMirror) refresh(true);
    } catch (err) {
      setMessages((m) => m.map((x) => x.pending ? { role: "assistant", content: `(${(err as Error).message})`, at: Date.now() } : x));
    } finally {
      setSending(false); scroll(); inputRef.current?.focus();
    }
  }

  async function toggleVoice() {
    if (voice.recording) {
      const { audio, prosody, mime } = await voice.stop();
      setBusy(true);
      try {
        const form = new FormData();
        form.append("audio", audio, mime.includes("mp4") ? "audio.mp4" : "audio.webm");
        const r = await fetch("/api/voice/transcribe", { method: "POST", body: form });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "transcription failed");
        if (j.text) { setVoiceNote(prosody); setInput((v) => (v ? v + " " : "") + j.text); inputRef.current?.focus(); }
        else setToast("Didn't catch anything.");
      } catch (err) { setToast((err as Error).message); }
      finally { setBusy(false); }
    } else {
      try { await voice.start(); } catch { setToast("Microphone permission was refused."); }
    }
  }

  async function settings(body: Record<string, unknown>) {
    setBusy(true);
    try { await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); await refresh(true); }
    finally { setBusy(false); }
  }
  async function preview(kind: string) {
    setBusy(true);
    try {
      await fetch("/api/checkin/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force: kind }) });
      await refresh(true);
      setShowMirror(false);
    } finally { setBusy(false); }
  }
  async function notUseful(m: Msg) {
    await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ at: m.at, kind: m.kind }) });
    setToast("Noted. That kind of check-in will come less.");
  }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {}); }, []);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <Orb size={40} tint={tint} />
        <div className="leading-tight">
          <div className="font-serif text-lg">Ori</div>
          <div className="text-[11px] text-clay-muted">software &middot; here for {name} &middot; <a href="/mood" className="underline decoration-dotted">change mood</a></div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setSpeak((s) => !s)} className={`clay-btn px-3 py-2 text-xs ${speak ? "bg-clay-peach" : ""}`} title="Read replies aloud">{speak ? "voice on" : "voice off"}</button>
          <button onClick={() => setShowMirror(true)} className="clay-btn px-3 py-2 text-xs">Mirror</button>
        </div>
      </header>

      <div ref={listRef} className="thin-scroll flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 py-4">
          {messages.map((m, i) => (
            <div key={m.at + ":" + i} className={`animate-rise flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap text-[15px] leading-relaxed ${m.role === "user" ? "bubble-user" : m.proactive ? "bubble-proactive" : "bubble-ai"}`}>
                {m.proactive && <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider opacity-60">unprompted · {m.kind?.replace("_", " ")}</div>}
                {m.pending ? <span className="inline-flex gap-1 py-1"><i className="h-1.5 w-1.5 animate-breathe rounded-full bg-clay-muted" /><i className="h-1.5 w-1.5 animate-breathe rounded-full bg-clay-muted [animation-delay:.2s]" /><i className="h-1.5 w-1.5 animate-breathe rounded-full bg-clay-muted [animation-delay:.4s]" /></span> : m.content}
                {m.proactive && !m.pending && <button onClick={() => notUseful(m)} className="mt-2 block text-[11px] text-clay-muted underline decoration-dotted">this wasn&apos;t useful</button>}
              </div>
            </div>
          ))}
          {crisis && <CrisisCard helplines={crisis.helplines} emergency={crisis.emergency} />}
        </div>
      </div>

      <footer className="px-4 pb-4 pt-2 sm:px-6">
        <form className="mx-auto flex max-w-2xl items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <button type="button" onClick={toggleVoice} disabled={busy} aria-label={voice.recording ? "stop recording" : "record a voice message"}
            className={`clay-btn relative h-12 w-12 shrink-0 overflow-hidden rounded-full p-0 ${voice.recording ? "bg-clay-coral text-white" : ""}`}>
            {voice.recording && <span className="meter absolute inset-x-0 bottom-0 bg-white/30" style={{ transform: `scaleY(${voice.level})`, height: "100%" }} />}
            <span className="relative">{voice.recording ? "■" : "●"}</span>
          </button>
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { typing.onKeyDown(e); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1} placeholder={voice.recording ? "listening…" : "say anything"} className="clay-input max-h-40 min-h-[48px] resize-none py-3.5" />
          <button type="submit" disabled={sending || !input.trim()} className="clay-btn-primary h-12 shrink-0 rounded-full px-5">Send</button>
        </form>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-clay-muted">
          {voiceNote ? "voice tone captured · " : ""}{face.active ? "expression on · " : ""}Ori is software, not a therapist. In crisis, use a helpline.
        </p>
      </footer>

      {showMirror && <MirrorPanel mirror={mirror} onClose={() => setShowMirror(false)} onSettings={settings} onPreview={preview} onLogout={logout} busy={busy} push={push} onToast={setToast} />}
      {toast && <div className="clay-dark fixed bottom-24 left-1/2 z-40 -translate-x-1/2 px-4 py-2 text-sm">{toast}</div>}
    </div>
  );
}
