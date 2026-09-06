"use client";
/**
 * Creating a companion, in ten small steps. Feels like building a character:
 * the face on the left reacts to every choice, and the preview step shows how
 * they'd actually text before anything is saved.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { avatarById, resolveLook } from "@/lib/companion/avatars";
import { defaultSettings } from "@/lib/companion/profile";
import type { CompanionSettings, Expression } from "@/lib/companion/types";
import { PxArrow, PxCheck } from "../home/pixelIcons";
import Avatar from "./Avatar";
import { AddressEditor, AvatarPicker, ConversationEditor, PersonalityEditor, RelationshipEditor, StylePicker, VoiceEditor, type Patch } from "./editors";
import { useCompanionVoice } from "../hooks/useCompanionVoice";

const STEPS = ["meet", "avatar", "name", "personality", "style", "address", "voice", "preview", "confirm"] as const;
type Step = typeof STEPS[number];

const TITLES: Record<Step, [string, string]> = {
  meet: ["Meet your companion.", "Someone to talk to, think with, and check in with. Made by you, in a couple of minutes."],
  avatar: ["Pick a face.", "Every one of them is an original character. You can change everything about them next."],
  name: ["Give them a name.", "Or keep the one they came with."],
  personality: ["Shape who they are.", "Slide each one until it feels right. There's no wrong answer."],
  style: ["How they talk.", "Texting rhythm, questions, emojis. This is what you'll notice most."],
  address: ["What they call you.", "A friend uses your name now and then, not every message."],
  voice: ["Their voice.", "Optional. Text is always the fallback."],
  preview: ["A quick preview.", "Here's how they'd handle a slightly off day."],
  confirm: ["Ready?", "You can change any of this later in Companion settings."],
};

export default function CompanionSetup({ initial, displayName, voiceProvider, edit }: { initial: CompanionSettings | null; displayName: string; voiceProvider: boolean; edit: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<CompanionSettings>(initial ?? defaultSettings());
  const [i, setI] = useState(edit ? 1 : 0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ role: "user" | "assistant"; content: string }[] | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string>("");
  const voice = useCompanionVoice(s.voice, voiceProvider);
  const step = STEPS[i];
  const patch: Patch = useCallback((p) => setS((cur) => (typeof p === "function" ? p(cur) : { ...cur, ...p })), []);
  const avatar = avatarById(s.appearance.avatarId);
  const look = useMemo(() => resolveLook(avatar, s.appearance.style), [avatar, s.appearance.style]);
  const expression: Expression = voice.speaking ? "happy" : step === "meet" ? "calm" : step === "avatar" ? "curious" : step === "name" ? "happy" : step === "personality" ? (s.personality.playful > 0.6 ? "excited" : s.personality.energy < 0.35 ? "calm" : "curious") : step === "preview" ? "thoughtful" : step === "confirm" ? "happy" : "neutral";

  const go = (d: 1 | -1) => { setDir(d); setI((x) => Math.max(0, Math.min(STEPS.length - 1, x + d))); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Enter" && step !== "name" && step !== "address" && step !== "confirm" && (e.target as HTMLElement)?.tagName !== "INPUT") go(1); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [step]);

  useEffect(() => {
    if (step !== "preview") return;
    setPreview(null);
    const ctl = new AbortController();
    fetch("/api/companion/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s), signal: ctl.signal })
      .then((r) => r.json()).then((j) => { setPreview(j.lines ?? []); setPreviewSrc(j.source ?? ""); })
      .catch(() => setPreview([]));
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function save() {
    setSaving(true); setErr(null);
    try {
      const r = await fetch("/api/companion/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, introduced: edit ? s.introduced : false }) });
      if (r.status === 401) { router.push("/login"); return; }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "couldn't save");
      router.push(edit ? "/companion" : "/companion/chat?intro=1");
    } catch (e) { setErr((e as Error).message); setSaving(false); }
  }

  const [title, sub] = TITLES[step];
  return (
    <div className={`cmp-setup cmp-bg-${s.appearance.background}`}>
      <aside className="cmp-setup-stage">
        <div className="cmp-stage-ring" aria-hidden />
        <div className="cmp-stage-face"><Avatar look={look} expression={expression} speaking={voice.speaking} level={voice.level} intensity={s.appearance.animation} intro={step === "meet"} /></div>
        <div className="cmp-stage-name"><b>{s.name}</b><span>{avatar.tagline}</span></div>
      </aside>

      <section className="cmp-setup-panel" key={step} data-dir={dir}>
        <div className="steps-ind" aria-label={`Step ${i + 1} of ${STEPS.length}`}>{STEPS.map((x, n) => <i key={x} className={n <= i ? "on" : ""} />)}<span>{i + 1} / {STEPS.length}</span></div>
        <h1 className="display cmp-setup-title">{title}</h1>
        <p className="muted cmp-setup-sub">{sub}</p>

        <div className="cmp-setup-body">
          {step === "meet" && (
            <div className="cmp-stack">
              <p className="cmp-copy">They&apos;ll remember what you tell them, check in when it makes sense, and say plainly that they&apos;re software if you ask. They&apos;re a bridge, not a destination: good company between the people in your life, never instead of them.</p>
              <div className="cmp-label">One quick thing</div>
              <div className="cmp-seg" role="radiogroup" aria-label="Age">
                {[{ v: false, l: "I'm 18 or over" }, { v: true, l: "I'm under 18" }, { v: null, l: "Rather not say" }].map((o) => (
                  <button key={String(o.v)} type="button" role="radio" aria-checked={s.minor === o.v} className={s.minor === o.v ? "on" : ""} onClick={() => patch({ minor: o.v })}>{o.l}</button>
                ))}
              </div>
              <p className="muted cmp-note">Under 18, or unsure, keeps the companion firmly in a friend role. It never changes what they can help with.</p>
            </div>
          )}
          {step === "avatar" && <><AvatarPicker s={s} patch={patch} />{!avatar.look.portrait && <><div className="cmp-label" style={{ marginTop: 18 }}>Style</div><StylePicker s={s} patch={patch} /></>}</>}
          {step === "name" && (
            <div className="cmp-stack">
              <input className="field cmp-name" autoFocus maxLength={24} value={s.name} onChange={(e) => patch({ name: e.target.value })} placeholder={avatar.name} aria-label="Companion name" />
            </div>
          )}
          {step === "personality" && <><PersonalityEditor s={s} patch={patch} /><div className="cmp-label" style={{ marginTop: 18 }}>Mostly here as</div><RelationshipEditor s={s} patch={patch} /></>}
          {step === "style" && <ConversationEditor s={s} patch={patch} />}
          {step === "address" && <AddressEditor s={s} patch={patch} displayName={displayName} />}
          {step === "voice" && <VoiceEditor s={s} patch={patch} providerAvailable={voiceProvider} onTry={(t) => { voice.speak(t); }} />}
          {step === "preview" && (
            <div className="cmp-preview">
              {preview === null && <div className="cmp-preview-wait"><i /><i /><i /></div>}
              {preview?.map((l, n) => <div key={n} className={`cmp-pv ${l.role}`} style={{ animationDelay: `${n * 260}ms` }}>{l.content}</div>)}
              {preview && <p className="muted cmp-note">{previewSrc === "model" ? "Generated live in their voice." : "A sample in their style."} Not saved anywhere.</p>}
            </div>
          )}
          {step === "confirm" && (
            <div className="cmp-summary">
              <div><span>Name</span><b>{s.name}</b></div>
              <div><span>Face</span><b>{avatar.name} · {avatar.styles.find((x) => x.id === s.appearance.style)?.label}</b></div>
              <div><span>Role</span><b>{s.relationship}</b></div>
              <div><span>Style</span><b>{s.conversation.length} · {s.conversation.questions} · {s.conversation.casual ? "casual" : "proper"} · emojis {s.conversation.emojis}</b></div>
              <div><span>Calls you</span><b>{s.address.mode === "none" ? "nothing" : s.address.mode === "first" ? displayName.split(" ")[0] : s.address.nickname || "-"}</b></div>
              <div><span>Voice</span><b>{s.voice.voiceId} · {s.voice.speed.toFixed(2)}x</b></div>
              <p className="muted cmp-note">You control what they remember. Every memory is listed in Companion memory with a delete button, and &quot;forget everything&quot; does exactly that.</p>
            </div>
          )}
        </div>

        {err && <p className="cmp-err" role="alert">{err}</p>}
        <div className="cmp-setup-nav">
          {i > 0 ? <button type="button" className="btn" onClick={() => go(-1)}>Back</button> : <a href="/chat" className="btn">Not now</a>}
          {step === "confirm"
            ? <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : edit ? "Save changes" : "Start talking"} <PxCheck className="pxicon" /></button>
            : <button type="button" className="btn btn-primary" onClick={() => go(1)}>{step === "meet" ? "Let's go" : "Next"} <PxArrow className="pxicon" /></button>}
        </div>
      </section>
    </div>
  );
}
