"use client";
/**
 * Companion Mode conversation.
 *
 * Desktop: conversation on the left, the animated companion in the centre, a
 * small "about" panel on the right. Mobile: companion on top, conversation
 * underneath, the panel as a bottom sheet. Replies stream in token by token;
 * the face changes with what arrives; the voice, when there is one, moves the
 * mouth. Safety is the main chat's safety: same risk gate, same crisis card,
 * same reliance countermeasures, because it is the same pipeline underneath.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { avatarById, resolveLook } from "@/lib/companion/avatars";
import type { CompanionProfile, Expression } from "@/lib/companion/types";
import { RELATIONSHIPS } from "@/lib/companion/types";
import type { TurnResult } from "@/lib/pipeline/turn";
import type { Helpline } from "@/lib/safety/resources";
import type { ScreeningOffer } from "@/lib/screening";
import { PxCog, PxBrain, PxSend, PxSound, PxMicoff, PxUser, PxRemove } from "../home/pixelIcons";
import CrisisCard from "../chat/CrisisCard";
import TechniqueOffer, { type TechKind } from "../chat/TechniqueOffer";
import Techniques from "../chat/Techniques";
import ScreeningCard, { type ScreeningResult } from "../chat/ScreeningCard";
import Avatar from "./Avatar";
import { useCompanionVoice } from "../hooks/useCompanionVoice";

interface Msg { role: "user" | "assistant"; content: string; at: number; proactive?: boolean; kind?: string; pending?: boolean; streaming?: boolean }

const POLL_MS = 45_000;
const SELF_EVAL_MS = 10 * 60_000;

function firstLine(p: CompanionProfile, name: string): string {
  const call = p.address.mode === "none" ? "" : p.address.mode === "first" ? name.split(" ")[0] : p.address.nickname || name.split(" ")[0];
  const hi = p.conversation.casual ? `hey${call ? " " + call.toLowerCase() : ""}.` : `Hey${call ? " " + call : ""}.`;
  const rest = p.personality.talkative > 0.6
    ? (p.conversation.casual ? ` i'm ${p.name}. software, i'll say that once so it's said. what's today been like?` : ` I'm ${p.name} - software, I'll say that once so it's said. What's today been like?`)
    : (p.conversation.casual ? ` ${p.name}. what's today been like?` : ` ${p.name}. What's today been like?`);
  return hi + rest;
}

/** Face from the model's read of the turn. Never announced, only worn. */
function expressionFor(a: TurnResult["analysis"] | null, risk: string): Expression {
  if (!a) return "neutral";
  if (risk !== "none") return "concerned";
  const x = a.axes as unknown as Record<string, number>;
  const top = Object.entries(x).sort((p, q) => q[1] - p[1])[0];
  if (!top || top[1] < 0.3) return a.intensity > 0.6 ? "thoughtful" : "calm";
  switch (top[0]) {
    case "joy": return a.intensity > 0.6 ? "excited" : "happy";
    case "sadness": case "fear": case "disgust": return "concerned";
    case "surprise": return "surprised";
    case "anticipation": return "curious";
    case "trust": return "happy";
    case "anger": return "thoughtful";
    default: return "neutral";
  }
}

export default function CompanionChat({ profile: initialProfile, displayName, voiceProvider }: { profile: CompanionProfile; displayName: string; voiceProvider: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [profile, setProfile] = useState(initialProfile);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [expression, setExpression] = useState<Expression>("calm");
  const [crisis, setCrisis] = useState<{ helplines: Helpline[]; emergency: string } | null>(null);
  const [offer, setOffer] = useState<{ reason: string; suggested: TechKind[] } | null>(null);
  const [tech, setTech] = useState<TechKind | null>(null);
  const [screening, setScreening] = useState<ScreeningOffer | null>(null);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [intro, setIntro] = useState(params.get("intro") === "1" && !initialProfile.introduced);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tz = useRef(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const voice = useCompanionVoice(profile.voice, voiceProvider);
  const avatar = avatarById(profile.appearance.avatarId);
  const look = useMemo(() => resolveLook(avatar, profile.appearance.style), [avatar, profile.appearance.style]);
  const rel = RELATIONSHIPS.find((r) => r.id === profile.relationship)?.label ?? "Supportive friend";

  const scroll = useCallback(() => { requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })); }, []);

  // Expression drifts back to calm after a reaction.
  useEffect(() => { if (expression === "neutral" || expression === "calm") return; const t = setTimeout(() => setExpression("calm"), 9000); return () => clearTimeout(t); }, [expression]);

  const say = useCallback(async (text: string) => {
    const m = await voice.speak(text);
    if (m === "text") setToast("No voice available here, so replies stay as text.");
  }, [voice]);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/companion/messages?limit=80", { cache: "no-store" });
      if (r.status === 401) { router.push("/login"); return null; }
      if (r.status === 404) { router.push("/companion/setup"); return null; }
      const j = await r.json() as { messages: Msg[]; outbox: Msg[] };
      if (j.outbox?.length) {
        setMessages((m) => [...m, ...j.outbox]);
        setExpression("curious"); scroll();
        if (profile.voice.autoplay) say(j.outbox[j.outbox.length - 1].content);
      }
      return j;
    } catch { return null; }
  }, [router, scroll, say, profile.voice.autoplay]);

  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return; // React dev StrictMode mounts twice; the greeting must appear once.
    booted.current = true;
    (async () => {
      const j = await refresh();
      if (j?.messages?.length) { setMessages((m) => [...j.messages, ...m.filter((x) => x.proactive)]); scroll(); }
      else {
        const line = firstLine(profile, displayName);
        setMessages((m) => [{ role: "assistant", content: line, at: Date.now() }, ...m]);
        setExpression("happy");
        if (intro) setTimeout(() => { if (profile.voice.autoplay) say(line); }, 1400);
      }
      fetch("/api/companion/memory").then((r) => r.json()).then((j) => setMemoryCount(j.memories?.length ?? 0)).catch(() => {});
      if (intro) {
        setTimeout(() => setIntro(false), 2600);
        fetch("/api/companion/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, introduced: true }) }).catch(() => {});
      }
    })();
    const poll = setInterval(refresh, POLL_MS);
    const evaluate = async () => { try { await fetch("/api/checkin/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); await refresh(); } catch { /* ignore */ } };
    const sched = setInterval(evaluate, SELF_EVAL_MS);
    const t = setTimeout(evaluate, 8000);
    return () => { clearInterval(poll); clearInterval(sched); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput(""); setSending(true);
    const at = Date.now();
    setMessages((m) => [...m, { role: "user", content: text, at }, { role: "assistant", content: "", at: at + 1, pending: true }]);
    setExpression("thoughtful"); scroll();
    try {
      const clientContext = messages.filter((m) => !m.pending).slice(-12).map((m) => ({ role: m.role, content: m.content }));
      const r = await fetch("/api/companion/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, timeZone: tz.current, clientContext }) });
      if (r.status === 401) { router.push("/login"); return; }
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); throw new Error((j as { error?: string }).error ?? "something went wrong"); }
      const reader = r.body.getReader(); const dec = new TextDecoder();
      type Done = TurnResult & { newMemories: { id: string; text: string }[] };
      let buf = "", acc = "", error: string | null = null;
      let done: Done | null = null;
      while (true) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const j = JSON.parse(line) as { d?: string; done?: Done; error?: string; replace?: string };
          if (j.d) { acc += j.d; if (acc.length === j.d.length) setExpression("neutral"); setMessages((m) => m.map((x) => x.pending ? { ...x, content: acc, streaming: true } : x)); scroll(); }
          if (j.replace) { acc = j.replace; setMessages((m) => m.map((x) => x.pending ? { ...x, content: acc } : x)); }
          if (j.done) done = j.done;
          if (j.error) error = j.error;
        }
      }
      if (error) throw new Error(error);
      const fin: Done | null = done;
      const final = fin?.reply ?? acc;
      setMessages((m) => m.map((x) => x.pending ? { role: "assistant", content: final, at: fin?.at ?? Date.now() } : x));
      if (fin) {
        setExpression(expressionFor(fin.analysis, fin.risk.tier));
        if (fin.helplines) setCrisis({ helplines: fin.helplines, emergency: fin.emergency });
        else if (crisis && fin.risk.tier === "none" && /\b(ok|okay|fine|better|safe)\b/i.test(text)) setCrisis(null);
        if (fin.techniqueOffer) { setOffer(fin.techniqueOffer); setTech(null); } else setOffer(null);
        if (fin.screeningOffer) setScreening(fin.screeningOffer);
        if (fin.newMemories?.length) setMemoryCount((c) => (c ?? 0) + fin.newMemories.length);
      }
      if (profile.voice.autoplay) say(final);
    } catch (err) {
      setMessages((m) => m.map((x) => x.pending ? { role: "assistant", content: `(${(err as Error).message})`, at: Date.now() } : x));
      setExpression("concerned");
    } finally { setSending(false); scroll(); inputRef.current?.focus(); }
  }

  async function toggleAutoplay() {
    const next = { ...profile, voice: { ...profile.voice, autoplay: !profile.voice.autoplay } };
    setProfile(next);
    await fetch("/api/companion/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }).catch(() => {});
  }

  const typingClass = profile.personality.energy > 0.65 ? "fast" : profile.personality.energy < 0.35 ? "slow" : "";
  const panel = (
    <div className="cmp-about">
      <div className="cmp-about-head"><b>{profile.name}</b><span>{avatar.tagline}</span></div>
      <dl className="cmp-about-list">
        <div><dt>Here as</dt><dd>{rel}</dd></div>
        <div><dt>Remembers</dt><dd>{memoryCount === null ? "…" : memoryCount === 0 ? "nothing yet" : `${memoryCount} thing${memoryCount === 1 ? "" : "s"}`}</dd></div>
        <div><dt>Voice</dt><dd>{voice.mode === "provider" ? "on the server" : voice.mode === "browser" ? "your browser's" : voice.mode === "text" ? "text only" : "…"}</dd></div>
      </dl>
      <div className="cmp-about-actions">
        <button type="button" className={`btn ${profile.voice.autoplay ? "on" : ""}`} onClick={toggleAutoplay}><PxSound className="pxicon" /> {profile.voice.autoplay ? "Reads aloud" : "Read aloud"}</button>
        <button type="button" className={`btn ${voice.muted ? "on" : ""}`} onClick={() => { voice.setMuted(!voice.muted); if (!voice.muted) voice.stop(); }}><PxMicoff className="pxicon" /> {voice.muted ? "Muted" : "Mute"}</button>
        <a href="/companion/setup?edit=1" className="btn"><PxUser className="pxicon" /> Customize</a>
        <a href="/companion/memory" className="btn"><PxBrain className="pxicon" /> Memory</a>
        <a href="/companion/settings" className="btn"><PxCog className="pxicon" /> Settings</a>
      </div>
      <p className="muted cmp-note">{profile.name} is software and says so. A bridge, not a destination. <a href="/chat">Back to the main chat</a>.</p>
    </div>
  );

  return (
    <div className={`cmp-chat cmp-bg-${profile.appearance.background} ${intro ? "cmp-intro" : ""}`}>
      <header className="cmp-chat-head">
        <a href="/companion" className="cmp-back" aria-label="Companion home">MindEase</a>
        <div className="cmp-head-name"><b>{profile.name}</b><span>{voice.speaking ? "speaking" : sending ? "typing…" : "here"}</span></div>
        <button type="button" className="btn cmp-sheet-btn" onClick={() => setSheet(true)} aria-label="About your companion"><PxUser className="pxicon" /></button>
      </header>

      <div className="cmp-layout">
        <section className="cmp-col cmp-conv" aria-label="Conversation">
          <div ref={listRef} className="cmp-list thin-scroll">
            {messages.map((m, i) => (
              <div key={m.at + ":" + i} className={`cmp-msg ${m.role} ${m.proactive ? "proactive" : ""} ${m.streaming ? "streaming" : ""}`}>
                {m.proactive && <div className="cmp-msg-k">checked in · {m.kind?.replace("_", " ")}</div>}
                {m.pending && !m.content ? <span className={`cmp-typing ${typingClass}`}><i /><i /><i /></span> : m.content}
              </div>
            ))}
            {crisis && <CrisisCard helplines={crisis.helplines} emergency={crisis.emergency} />}
            {offer && !tech && <TechniqueOffer reason={offer.reason} suggested={offer.suggested} onPick={(k) => { setTech(k); setOffer(null); }} onDismiss={() => setOffer(null)} />}
            {screening && <ScreeningCard offer={screening} onDismiss={() => setScreening(null)} onDone={(r: ScreeningResult) => { setScreening(null); setMessages((m) => [...m, { role: "assistant", content: r.message, at: Date.now() }]); if (r.crisis && r.helplines) setCrisis({ helplines: r.helplines as Helpline[], emergency: r.emergency }); scroll(); }} />}
            {tech && <Techniques mood={null} initial={tech} onClose={() => setTech(null)} />}
          </div>
          <form className="cmp-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder={`say anything to ${profile.name}`}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} aria-label="Message" />
            <button type="submit" className="btn-primary cmp-send" disabled={sending || !input.trim()} aria-label="Send"><PxSend className="pxicon" /></button>
          </form>
          <p className="cmp-foot muted">{profile.name} is software, not a therapist. In crisis, use a helpline.</p>
        </section>

        <section className="cmp-col cmp-stage" aria-label="Your companion">
          <div className="cmp-stage-ring" aria-hidden />
          <div className="cmp-particles" aria-hidden>{Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ ["--i" as string]: i }} />)}</div>
          <a href="/companion/setup?edit=1" className="cmp-stage-face" aria-label="Customize your companion">
            <Avatar look={look} expression={expression} speaking={voice.speaking} level={voice.level} intensity={profile.appearance.animation} intro={intro} />
            <span className="cmp-stage-hover">Customize</span>
          </a>
          {voice.speaking && <button type="button" className="btn cmp-stop" onClick={voice.stop}><PxRemove className="pxicon" /> Stop</button>}
        </section>

        <aside className="cmp-col cmp-side">{panel}</aside>
      </div>

      {sheet && <div className="cmp-sheet-wrap" onClick={() => setSheet(false)}><div className="cmp-sheet" onClick={(e) => e.stopPropagation()}><button type="button" className="cmp-sheet-close" onClick={() => setSheet(false)} aria-label="Close"><PxRemove className="pxicon" /></button>{panel}</div></div>}
      {toast && <div className="cmp-toast">{toast}</div>}
    </div>
  );
}
