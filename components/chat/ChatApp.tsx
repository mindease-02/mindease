"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Orb from "../Orb";
import { PxArrow, PxMic, PxMicoff, PxSend, PxMenu, PxRemove, PxShield } from "../home/pixelIcons";
import CrisisCard from "./CrisisCard";
import MirrorPanel from "./MirrorPanel";
import Techniques from "./Techniques";
import TechniqueOffer, { type TechKind } from "./TechniqueOffer";
import ScreeningCard, { type ScreeningResult } from "./ScreeningCard";
import LivingBackground from "./LivingBackground";
import ChatDrawer from "./ChatDrawer";
import ProfileMenu from "./ProfileMenu";
import MirrorCaption, { type Caption } from "./MirrorCaption";
import MemoryCard, { type MemoryLite } from "./MemoryCard";
import InsightLine from "./InsightLine";
import SessionClose, { isGoodbye } from "./SessionClose";
import { assessRisk, atLeast } from "@/lib/safety/crisis";
import { helplinesFor, emergencyFor } from "@/lib/safety/resources";
import { regionFor } from "@/lib/util/region";
import { popIn } from "@/lib/motion";
import type { ScreeningOffer } from "@/lib/screening";
import { useTypingMetrics } from "../hooks/useTypingMetrics";
import { useVoiceFeatures } from "../hooks/useVoiceFeatures";
import { useFaceAffect } from "../hooks/useFaceAffect";
import { usePush } from "../hooks/usePush";
import type { UserView } from "@/lib/pipeline/userView";
import type { TurnResult } from "@/lib/pipeline/turn";
import type { ProsodyFeatures } from "@/lib/affect/prosody";
import type { Helpline } from "@/lib/safety/resources";
import type { ChatSession } from "@/lib/store/types";
import { greetingFor, languageMeta, moodText, scriptOf, t, uiLang } from "@/lib/i18n";
import { tx } from "@/lib/i18n/tx";

interface Msg { role: "user" | "assistant"; content: string; at: number; proactive?: boolean; kind?: string; pending?: boolean; caption?: Caption; brought?: MemoryLite[]; proposed?: MemoryLite[]; insight?: string; fallback?: boolean }
type CrisisMode = "show" | "confirm" | "open";
type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

const POLL_MS = 45_000;
const SELF_EVAL_MS = 10 * 60_000;
/** Voice chat: stop listening after this much quiet once the person has spoken. */
const SILENCE_MS = 1500;
const MAX_UTTERANCE_MS = 45_000;
/** The list counts as "at the bottom" within this many pixels; new messages only auto-scroll then. */
const NEAR_BOTTOM_PX = 80;
/** After this many of the person's turns, offer to leave it here (once per chat). */
const CLOSE_AFTER_TURNS = 12;
/** The composer grows with the text up to about five lines. */
const COMPOSER_MAX_PX = 160;

const LOCALE: Record<string, string> = { en: "en-IN", ta: "ta-IN", hi: "hi-IN", te: "te-IN", kn: "kn-IN", ml: "ml-IN" };
const STARTERS: [string, string][] = [["chipHeavy", "today was heavy"], ["chipSleep", "can't sleep"], ["chipFlat", "good but flat"]];
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keep Tab (and Shift+Tab) inside `root`. */
function trapTab(e: ReactKeyboardEvent, root: HTMLElement | null) {
  if (e.key !== "Tab" || !root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
  if (!items.length) { e.preventDefault(); root.focus(); return; }
  const first = items[0], last = items[items.length - 1], cur = document.activeElement;
  if (e.shiftKey && (cur === first || cur === root || !root.contains(cur))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (cur === last || !root.contains(cur))) { e.preventDefault(); first.focus(); }
}

/** A card that rises above the composer. Focus moves into it, Tab stays inside, and it hands focus back when it goes. */
function Sheet({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    (ref.current?.firstElementChild as HTMLElement | null)?.focus();
    return () => { if (prev && prev.isConnected) prev.focus(); };
  }, []);
  return <div ref={ref} className="offer-sheet" onKeyDown={(e) => trapTab(e, ref.current)}>{children}</div>;
}

export default function ChatApp({ name, email, initialLanguage, initialUi }: { name: string; email: string; initialLanguage: string; initialUi?: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mirror, setMirror] = useState<UserView | null>(null);
  const [showMirror, setShowMirror] = useState(false);
  const [arrival, setArrival] = useState<{ mood?: string; label: string; note?: string } | null>(null);
  const [offer, setOffer] = useState<{ reason: string; suggested: TechKind[] } | null>(null);
  const [screening, setScreening] = useState<ScreeningOffer | null>(null);
  const [tech, setTech] = useState<TechKind | null>(null);
  const [crisis, setCrisis] = useState<{ helplines: Helpline[]; emergency: string; mode: CrisisMode } | null>(null);
  const [notice, setNotice] = useState<"steadier" | "shorter" | null>(null);
  const [closeCard, setCloseCard] = useState(false);
  const [jump, setJump] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetOpen = crisis?.mode === "open";
  useEffect(() => { if (sheetOpen) sheetRef.current?.focus(); }, [sheetOpen]);
  const [tint, setTint] = useState<{ warm: number; cool: number; dim: number }>({ warm: 0.5, cool: 0.3, dim: 0 });
  const [speak, setSpeak] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<ProsodyFeatures | null>(null);
  const [lang, setLang] = useState(initialLanguage && initialLanguage !== "auto" ? initialLanguage : (initialUi ?? "auto"));
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [pulse, setPulse] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voiceRef = useRef<HTMLDivElement>(null);
  const voiceOrbRef = useRef<HTMLButtonElement>(null);
  const nearBottom = useRef(true);
  /** The chat (session id) the close card has already been offered in. */
  const closeShownFor = useRef<string | null>(null);
  const typing = useTypingMetrics();
  const voice = useVoiceFeatures();
  const face = useFaceAffect();
  const push = usePush();
  const tz = useRef(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const langRef = useRef(lang); langRef.current = lang;
  const voiceModeRef = useRef(false);
  const heard = useRef({ spoke: false, lastLoud: 0, startedAt: 0, empties: 0 });
  const speakRef = useRef(speak); speakRef.current = speak;

  // Every bubble that has not been shown yet pops in (history on load staggers; new ones arrive one at a time).
  useEffect(() => {
    const fresh = Array.from(listRef.current?.querySelectorAll<HTMLElement>(".bubble-ai:not([data-shown]), .bubble-user:not([data-shown]), .bubble-proactive:not([data-shown])") ?? []);
    fresh.forEach((el, i) => { el.dataset.shown = "1"; if (!popIn(el, Math.min(i, 12) * 40)) el.style.opacity = "1"; });
  }, [messages]);

  // Smart auto-scroll: follow new messages only while the person is at the bottom; otherwise offer "Jump to latest".
  const onListScroll = useCallback(() => {
    const el = listRef.current; if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottom.current) setJump(false);
  }, []);
  const scroll = useCallback((force = false) => {
    if (!force && !nearBottom.current) { setJump(true); return; }
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  }, []);

  const refresh = useCallback(async (withMirror: boolean) => {
    try {
      const r = await fetch(`/api/state?tz=${encodeURIComponent(tz.current)}${withMirror ? "&mirror=1" : ""}`, { cache: "no-store" });
      if (r.status === 401) { router.push("/login"); return; }
      const j = await r.json();
      if (j.mirror) setMirror(j.mirror);
      if (Array.isArray(j.sessions)) { setSessions(j.sessions); setCurrentId(j.currentSessionId ?? null); }
      if (typeof j.language === "string" && j.language !== "auto") setLang(j.language);
      if (j.notice === "steadier" || j.notice === "shorter") setNotice(j.notice);
      if (Array.isArray(j.outbox) && j.outbox.length) {
        setMessages((m) => [...m, ...j.outbox]);
        setPulse((p) => p + 1);
        typing.onPromptShown();
        scroll();
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          new Notification("MindEase", { body: j.outbox[j.outbox.length - 1].content.slice(0, 120) });
        }
        if (speakRef.current) say(j.outbox[j.outbox.length - 1].content);
      }
      return j;
    } catch { /* offline; try again next tick */ }
  }, [router, scroll, typing]);

  const greeting = (a: typeof arrival, l: string, at: number): Msg => ({ role: "assistant", content: greetingFor(name, a, l), at, kind: "greeting" });

  // Boot: load stored transcript + mirror, then poll for unprompted messages and
  // run the client-side scheduler (so check-ins work even without cron/KV).
  useEffect(() => {
    (async () => {
      const j = await refresh(true);
      const a = (j?.arrival as { mood?: string; label: string; note?: string } | null) ?? null;
      setArrival(a);
      const l = typeof j?.language === "string" && j.language !== "auto" ? j.language : (initialUi ?? initialLanguage);
      // If the person already sent something while this loaded, keep it rather than replacing it with history.
      if (j?.messages?.length) { setMessages((cur) => cur.some((m) => m.role === "user") ? [...j.messages, ...cur] : j.messages); scroll(true); }
      else setMessages((cur) => cur.some((m) => m.role === "user") ? [greeting(a, l, Date.now() - 1), ...cur] : [greeting(a, l, Date.now())]);
    })();
    const poll = setInterval(() => refresh(false), POLL_MS);
    const evaluate = async () => { try { await fetch("/api/checkin/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); await refresh(false); } catch { /* ignore */ } };
    const sched = setInterval(evaluate, SELF_EVAL_MS);
    const tm = setTimeout(evaluate, 8_000);
    return () => { clearInterval(poll); clearInterval(sched); clearTimeout(tm); };
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

  // The composer grows with the text, to about five lines, then scrolls.
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }, [input]);

  /** Speak a reply in the right language; resolves when the audio has finished. */
  function say(text: string): Promise<void> {
    const explicit = languageMeta(langRef.current);
    const code = explicit.speech ?? (scriptOf(text) === "en" ? undefined : scriptOf(text));
    const ttsLang = explicit.tts ?? languageMeta(scriptOf(text)).tts ?? "en-IN";
    return new Promise<void>(async (resolve) => {
      try {
        const r = await fetch("/api/voice/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, language: code }) });
        if (r.status === 200) {
          const url = URL.createObjectURL(await r.blob()); const a = new Audio(url);
          a.onended = () => resolve(); a.onerror = () => resolve();
          a.play().catch(() => resolve()); return;
        }
      } catch { /* fall through */ }
      if (!("speechSynthesis" in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.0; u.lang = ttsLang;
      const voices = speechSynthesis.getVoices();
      const v = voices.find((x) => x.lang.toLowerCase().startsWith(ttsLang.slice(0, 2)) && /female|samantha|karen|moira|serena|lekha|veena|google/i.test(x.name))
        ?? voices.find((x) => x.lang.toLowerCase().startsWith(ttsLang.slice(0, 2)))
        ?? voices.find((x) => /samantha|karen|moira|female|serena/i.test(x.name));
      if (v) u.voice = v;
      u.onend = () => resolve(); u.onerror = () => resolve();
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    });
  }

  async function send(textOverride?: string, prosody?: ProsodyFeatures): Promise<boolean> {
    setOffer(null); // a new message answers or moves past the offer; it must not linger under the typing dots
    setCloseCard(false);
    const text = (textOverride ?? input).trim();
    if (!text || sending) return false;
    const typingFeatures = typing.finish(text.length);
    const faceFeatures = face.active ? face.collect() : undefined;
    setInput("");
    setVoiceNote(null);
    const at = Date.now();
    // Measure before the new bubble lands: at the bottom, follow it; reading further up, offer "Jump to latest" instead.
    const el = listRef.current;
    const near = el ? el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX : true;
    setMessages((m) => [...m, { role: "user", content: text, at }, { role: "assistant", content: "", at: at + 1, pending: true }]);
    setSending(true); scroll(near); buzz(8);
    // Explicit crisis language puts help on screen now, before the server has answered.
    const quick = assessRisk(text);
    if (atLeast(quick.tier, "active") || (quick.tier === "passive" && !quick.discounted && quick.strength >= 0.7)) {
      const region = regionFor(tz.current, navigator.language);
      setCrisis({ helplines: helplinesFor(region, langRef.current), emergency: emergencyFor(region), mode: "show" });
    }
    try {
      const clientContext = messages.filter((m) => !m.fallback).slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, timeZone: tz.current, prosody: prosody ?? voiceNote ?? undefined, typing: typingFeatures, face: faceFeatures, clientContext }),
      });
      if (r.status === 401) { router.push("/login"); return false; }
      const j = (await r.json()) as TurnResult & { error?: string };
      if (!r.ok) throw new Error(j.error ?? "something went wrong");
      // Session-only: the caption and the memory cards come from this turn's result and are never re-fetched.
      const caption: Caption = { axes: j.analysis.axes, confidence: j.confidence, states: j.analysis.states.slice(0, 3).map((s) => s.name), need: j.analysis.need, why: j.analysis.why, source: j.analysis.source, used: j.memoriesUsed ?? [], raised: !!j.riskRaised };
      setMessages((m) => m.map((x) => x.pending ? { role: "assistant", content: j.reply, at: j.at, caption, fallback: j.fallback, brought: j.broughtUp ?? [], proposed: [...(j.proposedMemories ?? []), ...(j.newMemories ?? []).map((n) => ({ ...n, kept: true }))], insight: j.insight?.kind } : x));
      setPulse((p) => p + 1); buzz(12);
      typing.onPromptShown();
      if (j.helplines && j.crisis === "show") setCrisis({ helplines: j.helplines, emergency: j.emergency, mode: "show" });
      else if (j.helplines && j.crisis === "confirm") setCrisis((c) => c ?? { helplines: j.helplines!, emergency: j.emergency, mode: "confirm" });
      else if (crisis && crisis.mode !== "open" && j.risk.tier === "none" && /\b(ok|okay|fine|better|safe)\b/i.test(text)) setCrisis(null);
      if (j.techniqueOffer) { setOffer(j.techniqueOffer); setTech(null); } else setOffer(null);
      if (j.screeningOffer) setScreening(j.screeningOffer);
      const a = j.analysis.axes;
      setTint({ warm: Math.min(1, a.joy * 0.7 + a.trust * 0.5 + a.anticipation * 0.3), cool: Math.min(1, a.sadness * 0.6 + a.fear * 0.5), dim: Math.min(1, (a.sadness + a.disgust) * 0.5) });
      fetch("/api/sessions", { cache: "no-store" }).then((x) => x.json()).then((x) => { if (Array.isArray(x.sessions)) { setSessions(x.sessions); setCurrentId(x.currentSessionId ?? null); } }).catch(() => {});
      if (showMirror) refresh(true);
      // A natural end: a long chat, or a goodbye. Offered once per chat, never while help is on screen.
      const chatKey = currentId ?? "new";
      const userTurns = messages.filter((m) => m.role === "user").length + 1;
      if (closeShownFor.current !== chatKey && !j.techniqueOffer && !j.screeningOffer && j.crisis !== "show" && (userTurns >= CLOSE_AFTER_TURNS || isGoodbye(text))) {
        closeShownFor.current = chatKey; setCloseCard(true);
      }
      if (speakRef.current || voiceModeRef.current) { setVoiceStatus("speaking"); await say(j.reply); }
      return true;
    } catch (err) {
      setMessages((m) => m.map((x) => x.pending ? { role: "assistant", content: `(${(err as Error).message})`, at: Date.now() } : x));
      return false;
    } finally {
      setSending(false); scroll(); if (!voiceModeRef.current) inputRef.current?.focus();
    }
  }

  // ---- Voice: one-shot dictation (mic button) and hands-free voice chat.
  async function transcribeClip(): Promise<{ text: string; prosody: ProsodyFeatures } | null> {
    const { audio, prosody, mime } = await voice.stop();
    const form = new FormData();
    form.append("audio", audio, mime.includes("mp4") ? "audio.mp4" : "audio.webm");
    const code = languageMeta(langRef.current).speech; if (code) form.append("language", code);
    const r = await fetch("/api/voice/transcribe", { method: "POST", body: form });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "transcription failed");
    return j.text ? { text: j.text as string, prosody } : null;
  }

  async function toggleDictation() {
    if (voiceModeRef.current || busy) return;
    if (voice.recording) {
      setBusy(true);
      try {
        const got = await transcribeClip();
        if (got) { setVoiceNote(got.prosody); setInput((v) => (v ? v + " " : "") + got.text); inputRef.current?.focus(); }
        else setToast(t("nothingHeard", lang));
      } catch (err) { setToast((err as Error).message); }
      finally { setBusy(false); }
    } else {
      try { await voice.start(); } catch { setToast(t("micDenied", lang)); }
    }
  }

  const listen = useCallback(async () => {
    if (!voiceModeRef.current) return;
    try {
      heard.current = { ...heard.current, spoke: false, lastLoud: performance.now(), startedAt: performance.now() };
      await voice.start();
      // Voice chat ended while the mic was opening: let it go rather than leave the composer "listening".
      if (!voiceModeRef.current) { voice.stop().catch(() => {}); return; }
      setVoiceStatus("listening");
    } catch { setToast(t("micDenied", langRef.current)); stopVoiceMode(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice]);

  async function finishListening() {
    if (!voice.recording) return;
    setVoiceStatus("thinking");
    try {
      const got = await transcribeClip();
      if (!got) {
        heard.current.empties += 1;
        if (heard.current.empties >= 3) { setToast(t("nothingHeard", lang)); stopVoiceMode(); return; }
        listen(); return;
      }
      heard.current.empties = 0;
      await send(got.text, got.prosody);
    } catch (err) { setToast((err as Error).message); }
    if (voiceModeRef.current) listen(); else setVoiceStatus("idle");
  }

  // Silence detection for voice chat: end the utterance after a quiet gap, or a hard cap.
  useEffect(() => {
    if (!voiceModeRef.current || !voice.recording || voiceStatus !== "listening") return;
    const now = performance.now();
    if (voice.level > 0.12) { heard.current.spoke = true; heard.current.lastLoud = now; }
    const quiet = now - heard.current.lastLoud;
    if ((heard.current.spoke && quiet > SILENCE_MS) || now - heard.current.startedAt > MAX_UTTERANCE_MS) finishListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.level, voice.recording, voiceStatus]);

  async function startVoiceMode() {
    if (voice.recording) return;
    voiceModeRef.current = true; setVoiceMode(true); heard.current.empties = 0;
    listen();
  }
  function stopVoiceMode() {
    voiceModeRef.current = false; setVoiceMode(false); setVoiceStatus("idle");
    if (voice.recording) voice.stop().catch(() => {});
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  // The voice overlay owns focus while it is up, and gives it back to where it came from.
  useEffect(() => {
    if (!voiceMode) return;
    const prev = document.activeElement as HTMLElement | null;
    const root = rootRef.current, input = inputRef.current;
    voiceOrbRef.current?.focus();
    return () => {
      const back = prev && prev.isConnected && prev !== document.body ? prev : root?.querySelector<HTMLElement>(".avatar-btn") ?? input;
      back?.focus();
    };
  }, [voiceMode]);

  // ---- Sessions
  async function sessionsCall(body: Record<string, unknown>) {
    const r = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "couldn't do that");
    setSessions(j.sessions ?? []); setCurrentId(j.currentSessionId ?? null);
    return j as { messages: Msg[]; currentSessionId: string | null };
  }
  async function newChat() {
    try {
      await sessionsCall({ action: "new" });
      setMessages([greeting(arrival, lang, Date.now())]);
      setCrisis(null); setOffer(null); setScreening(null); setTech(null); setCloseCard(false); setDrawer(false); scroll(true);
    } catch (err) { setToast((err as Error).message); }
  }
  async function pickChat(id: string) {
    if (id === currentId) { setDrawer(false); return; }
    try {
      const j = await sessionsCall({ action: "switch", id });
      setMessages(j.messages.length ? j.messages : [greeting(arrival, lang, Date.now())]);
      setCloseCard(false); setDrawer(false); scroll(true);
    } catch (err) { setToast((err as Error).message); }
  }
  async function deleteChat(id: string) {
    try {
      const j = await sessionsCall({ action: "delete", id });
      if (id === currentId) { setMessages(j.messages.length ? j.messages : [greeting(arrival, lang, Date.now())]); setCloseCard(false); }
    } catch (err) { setToast((err as Error).message); }
  }

  async function settings(body: Record<string, unknown>) {
    setBusy(true);
    try { await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); await refresh(true); }
    finally { setBusy(false); }
  }
  async function setLanguage(id: string) {
    setLang(id);
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: id }) });
  }
  function openHelp() {
    const region = regionFor(tz.current, navigator.language);
    setCrisis({ helplines: helplinesFor(region, langRef.current), emergency: emergencyFor(region), mode: "open" });
  }
  async function notUseful(m: Msg) {
    await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ at: m.at, kind: m.kind }) });
    setToast(t("noted", lang));
  }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }

  // ---- Leaving well: pause check-ins, or end with one line kept for next time.
  const hideClose = useCallback(() => setCloseCard(false), []);
  async function pauseCheckins() {
    await settings({ pauseDays: 3 });
    setToast(tx("closePausedToast", lang, "Check-ins paused for 3 days."));
  }
  async function endSession(note: string) {
    setBusy(true);
    try {
      if (note) await fetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "keep", kind: "goal", text: note, importance: 0.6 }) }).catch(() => {});
      setCloseCard(false);
      await newChat();
      router.push("/mood");
    } finally { setBusy(false); }
  }
  function pickStarter(key: string, fallback: string) {
    // Focus first: the chip itself is about to leave the DOM, and focus must not fall back to the body.
    inputRef.current?.focus();
    setInput(tx(key, lang, fallback));
  }

  useEffect(() => { if (toast) { const tm = setTimeout(() => setToast(null), 3500); return () => clearTimeout(tm); } }, [toast]);
  useEffect(() => { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {}); }, []);
  useEffect(() => () => { voiceModeRef.current = false; }, []);
  // Phones: when the keyboard opens, size the chat to the visible viewport so the composer stays above it.
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const apply = () => {
      const el = rootRef.current; if (!el) return;
      const small = window.matchMedia("(max-width: 720px)").matches;
      el.style.setProperty("--vvh", small ? `${Math.round(vv.height)}px` : "");
      if (small && vv.height < window.innerHeight - 120) scroll();
    };
    vv.addEventListener("resize", apply); vv.addEventListener("scroll", apply); apply();
    return () => { vv.removeEventListener("resize", apply); vv.removeEventListener("scroll", apply); };
  }, [scroll]);
  const buzz = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };

  const statusLine = voiceStatus === "listening" ? t("listening", lang) : voiceStatus === "thinking" ? t("thinking", lang) : voiceStatus === "speaking" ? t("speaking", lang) : t("tapToTalk", lang);
  const fmtDay = useMemo(() => new Intl.DateTimeFormat(LOCALE[uiLang(lang)] ?? "en-IN", { weekday: "long", day: "numeric", month: "long" }), [lang]);
  const greetingFirst = messages[0]?.kind === "greeting";
  const noUserYet = !messages.some((m) => m.role === "user");
  const showStarters = greetingFirst && messages.length === 1 && noUserYet && !input.trim();
  const arrivedLabel = arrival ? ((arrival.mood && moodText(arrival.mood, lang)?.[0]) || arrival.label) : "";
  const paused = !!mirror?.pausedUntil && mirror.pausedUntil > Date.now();
  const sheetUp = (!!offer && !tech) || !!screening;

  return (
    <div ref={rootRef} className="chat relative z-[1] flex h-screen flex-col" style={{ ["--warm" as string]: tint.warm, ["--cool" as string]: tint.cool, ["--dim" as string]: tint.dim }}>
      <LivingBackground tint={tint} level={voice.level} pulse={pulse} active={voice.recording || voiceStatus === "speaking"} />
      <header className="chat-head flex items-center gap-3 px-4 py-3 sm:px-6">
        <button className="clay-btn h-10 w-10 shrink-0 p-0" onClick={() => setDrawer(true)} aria-label={t("chats", lang)} title={t("chats", lang)}><PxMenu className="pxicon" style={{ fontSize: 18 }} /></button>
        <Orb size={40} tint={tint} />
        <div className="min-w-0 leading-tight">
          <h1 className="display chat-title text-lg">MindEase</h1>
          <div className="chat-sub text-[11px] text-clay-muted">{t("software", lang)}, {t("hereFor", lang, { name })} <a href="/mood" className="chat-sub-link underline decoration-dotted">{t("changeMood", lang)}</a></div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={openHelp} className="clay-btn help-btn help-pill text-xs" aria-label={t("helpNow", lang)} title={t("helpNow", lang)}><PxShield className="pxicon" /> <span className="hidden sm:inline">{t("helpNow", lang)}</span></button>
          <ProfileMenu name={name} email={email} lang={lang} speak={speak} onSpeak={setSpeak} onLanguage={setLanguage} onMirror={() => setShowMirror(true)} onVoice={startVoiceMode} onLogout={logout} />
        </div>
      </header>

      <main ref={listRef} onScroll={onListScroll} className="thin-scroll relative z-[1] flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 py-4" aria-live="polite">
          {notice && (
            <p className="chat-notice" role="note">
              {notice === "steadier" ? t("noteSteadier", lang) : t("noteShorter", lang)}{" "}
              <a href="/how-it-works">{t("noteWhy", lang)}</a>
              <button type="button" onClick={() => setNotice(null)} aria-label={t("close", lang)}>×</button>
            </p>
          )}
          {greetingFirst && arrival && (
            <p className="arrive-card">
              <b>{tx("arrivedAs", lang, "Arrived {mood}", { mood: arrivedLabel })}</b>
              {arrival.note && <span className="arrive-note">“{arrival.note}”</span>}
              <span className="arrive-date">{fmtDay.format(messages[0].at)}</span>
            </p>
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !!prev && new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
            return (
              <Fragment key={m.at + ":" + i}>
                {newDay && <div className="day-div" role="separator" aria-label={fmtDay.format(m.at)}><span>{fmtDay.format(m.at)}</span></div>}
                <div className={`animate-rise flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`} aria-hidden={m.pending || undefined}>
                  <div className={`max-w-[92%] sm:max-w-[85%] whitespace-pre-wrap text-[16px] leading-[1.6] ${m.role === "user" ? "bubble-user" : m.proactive ? "bubble-proactive" : "bubble-ai"}`}>
                    {m.proactive && <span className="bubble-eyebrow">{t("unprompted", lang)}</span>}
                    {m.pending ? <span className="inline-flex gap-1 py-1"><i className="h-1.5 w-1.5 animate-breathe rounded-full bg-clay-muted" /><i className="h-1.5 w-1.5 animate-breathe rounded-full bg-clay-muted [animation-delay:.2s]" /><i className="h-1.5 w-1.5 animate-breathe rounded-full bg-clay-muted [animation-delay:.4s]" /></span> : m.content}
                    {m.proactive && !m.pending && <button type="button" onClick={() => notUseful(m)} className="not-useful">{t("notUseful", lang)}</button>}
                  </div>
                  {m.insight && <InsightLine kind={m.insight} lang={lang} />}
                  {m.brought?.slice(0, 1).map((mem) => <MemoryCard key={"b" + mem.id} m={mem} lang={lang} mode="brought" />)}
                  {m.proposed?.map((mem) => <MemoryCard key={"p" + mem.id} m={mem} lang={lang} mode={(mem as MemoryLite & { kept?: boolean }).kept ? "kept" : "proposed"} />)}
                  {m.caption && <MirrorCaption c={m.caption} lang={lang} replyAt={m.at} replyLength={m.content.length} />}
                </div>
              </Fragment>
            );
          })}
          {showStarters && (
            <div className="starter">
              <div className="starter-chips">
                {STARTERS.map(([k, en]) => <button key={k} type="button" className="starter-chip" onClick={() => pickStarter(k, en)}>{tx(k, lang, en)}</button>)}
              </div>
              <p className="starter-hint">{tx("hintOneLine", lang, "Say anything. One line is enough.")}</p>
            </div>
          )}
          {closeCard && !sending && (
            <SessionClose lang={lang} busy={busy} paused={paused} onPause={pauseCheckins} onMirror={() => setShowMirror(true)} onEnd={endSession} onDismiss={hideClose} />
          )}
          {crisis && crisis.mode !== "open" && <CrisisCard key={crisis.mode} helplines={crisis.helplines} emergency={crisis.emergency} lang={lang} mode={crisis.mode} onClose={() => setCrisis(null)} />}
        </div>
      </main>

      {tech && <div className="relative z-[1] px-4 sm:px-6"><div className="mx-auto max-w-2xl"><Techniques lang={lang} mood={arrival?.mood ?? null} initial={tech} onClose={() => setTech(null)} /></div></div>}
      <footer className="chat-foot relative z-[1] px-4 pb-4 pt-2 sm:px-6">
        {jump && !sheetUp && (
          <button type="button" className="jump-pill" onClick={() => { setJump(false); scroll(true); }}>
            <PxArrow className="pxicon" style={{ transform: "rotate(90deg)" }} /> {tx("jumpLatest", lang, "Jump to latest")}
          </button>
        )}
        {offer && !tech && (
          <Sheet>
            <TechniqueOffer lang={lang} reason={offer.reason} suggested={offer.suggested} onPick={(k) => { setTech(k); setOffer(null); }} onDismiss={() => setOffer(null)} />
          </Sheet>
        )}
        {screening && (
          <Sheet>
            <ScreeningCard lang={lang} offer={screening} onDismiss={() => setScreening(null)} onDone={(r: ScreeningResult) => {
              setScreening(null);
              setMessages((m) => [...m, { role: "assistant", content: r.message, at: Date.now() }]);
              if (r.crisis && r.helplines) setCrisis({ helplines: r.helplines as Helpline[], emergency: r.emergency, mode: "show" });
              if (speak) say(r.message);
              scroll();
            }} />
          </Sheet>
        )}
        <form className="composer glass mx-auto flex max-w-2xl items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <button type="button" onClick={toggleDictation} aria-disabled={busy || undefined} aria-label={voice.recording ? "stop recording" : "record a voice message"}
            className={`clay-btn mic-btn relative h-12 w-12 shrink-0 overflow-hidden rounded-full p-0 ${voice.recording ? "bg-clay-coral text-white" : ""}`}>
            {voice.recording && <span className="meter absolute inset-x-0 bottom-0 bg-white/30" style={{ transform: `scaleY(${voice.level})`, height: "100%" }} />}
            <span className="relative">{voice.recording ? <PxMicoff className="pxicon" style={{ fontSize: 20 }} /> : <PxMic className="pxicon" style={{ fontSize: 20 }} />}</span>
          </button>
          <textarea ref={inputRef} value={input} onChange={(e) => { setInput(e.target.value); if (closeCard && e.target.value) setCloseCard(false); }} onKeyDown={(e) => { typing.onKeyDown(e); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1} placeholder={voice.recording ? t("listening", lang) : t("sayAnything", lang)} aria-label={t("sayAnything", lang)} className="clay-input max-h-40 min-h-[48px] resize-none py-3.5" />
          <button type="submit" disabled={sending || !input.trim()} aria-label={t("send", lang)} className={`clay-btn-primary send-btn h-12 shrink-0 rounded-full px-5 ${input.trim() && !sending ? "send-halo" : ""}`}><PxSend className="pxicon" /> <span className="hidden sm:inline">{t("send", lang)}</span></button>
        </form>
        <p className="chat-trust mx-auto mt-2 max-w-2xl text-center text-[10px] text-clay-muted">
          {voiceNote ? `${t("voiceLabel", lang)} ✓ ` : ""}{face.active ? `${t("faceLabel", lang)} ✓ ` : ""}{tx("composerTrust", lang, "Not therapy. Mirror shows what I read.")} <span className="hidden sm:inline">{t("trustLine", lang)}</span>
        </p>
      </footer>

      {voiceMode && (
        <div ref={voiceRef} className="voice-overlay" role="dialog" aria-modal="true" aria-label={t("voiceChat", lang)} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); stopVoiceMode(); } else trapTab(e, voiceRef.current); }}>
          <div className="voice-stage">
            <h2 className="voice-title">{t("voiceChat", lang)}</h2>
            <button ref={voiceOrbRef} type="button" className={`voice-orb big ${voiceStatus}`} style={{ ["--lvl" as string]: voice.level }} onClick={() => voiceStatus === "listening" ? finishListening() : voiceStatus === "idle" ? listen() : undefined} aria-label={statusLine}>
              <Orb size={160} tint={tint} pulse={voiceStatus !== "idle"} />
            </button>
            <p className="voice-status" aria-live="polite">{statusLine}</p>
            <button type="button" className="clay-btn voice-end" onClick={stopVoiceMode}><PxRemove className="pxicon" /> {t("endVoice", lang)}</button>
          </div>
        </div>
      )}

      {crisis?.mode === "open" && (
        <div className="crisis-sheet" role="dialog" aria-modal="true" aria-label={t("helpNow", lang)} tabIndex={-1} ref={sheetRef} onKeyDown={(e) => { if (e.key === "Escape") setCrisis(null); }} onClick={(e) => { if (e.target === e.currentTarget) setCrisis(null); }}>
          <CrisisCard helplines={crisis.helplines} emergency={crisis.emergency} lang={lang} mode="open" onClose={() => setCrisis(null)} />
        </div>
      )}
      <ChatDrawer open={drawer} lang={lang} sessions={sessions} currentId={currentId} onClose={() => setDrawer(false)} onNew={newChat} onPick={pickChat} onDelete={deleteChat} />
      {showMirror && <MirrorPanel lang={lang} mirror={mirror} onClose={() => setShowMirror(false)} onSettings={settings} onLogout={logout} busy={busy} push={push} />}
      {toast && <div className="clay-dark chat-toast fixed bottom-24 left-1/2 z-40 -translate-x-1/2 px-4 py-2 text-sm" role="status">{toast}</div>}
    </div>
  );
}
