"use client";
/**
 * Companion settings: appearance, personality, voice, relationship style,
 * memory, privacy. Saves on "Save", previews live on the left.
 */
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { avatarById, resolveLook } from "@/lib/companion/avatars";
import type { CompanionProfile, CompanionSettings } from "@/lib/companion/types";
import { PxCheck } from "../home/pixelIcons";
import Avatar from "./Avatar";
import { AddressEditor, AvatarPicker, BackgroundPicker, ConversationEditor, PersonalityEditor, RelationshipEditor, Segmented, StylePicker, VoiceEditor, type Patch } from "./editors";
import { useCompanionVoice } from "../hooks/useCompanionVoice";

const SECTIONS = ["appearance", "personality", "voice", "relationship", "memory", "privacy"] as const;

export default function CompanionSettingsPage({ profile, displayName, voiceProvider, memoryCount }: { profile: CompanionProfile; displayName: string; voiceProvider: boolean; memoryCount: number }) {
  const router = useRouter();
  const [s, setS] = useState<CompanionSettings>(profile);
  const [section, setSection] = useState<typeof SECTIONS[number]>("appearance");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const patch: Patch = useCallback((p) => setS((cur) => (typeof p === "function" ? p(cur) : { ...cur, ...p })), []);
  const voice = useCompanionVoice(s.voice, voiceProvider);
  const avatar = avatarById(s.appearance.avatarId);
  const look = useMemo(() => resolveLook(avatar, s.appearance.style), [avatar, s.appearance.style]);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/companion/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      if (r.status === 401) { router.push("/login"); return; }
      if (!r.ok) throw new Error((await r.json()).error ?? "couldn't save");
      setMsg("Saved.");
    } catch (e) { setMsg((e as Error).message); } finally { setSaving(false); }
  }
  async function clearHistory() {
    if (!confirm(`Delete the whole conversation with ${s.name}? This can't be undone.`)) return;
    await fetch("/api/companion/messages", { method: "DELETE" }); setMsg("Conversation history deleted.");
  }
  async function forgetAll() {
    if (!confirm(`Make ${s.name} forget everything? This can't be undone.`)) return;
    await fetch("/api/companion/memory?all=1", { method: "DELETE" }); setMsg("Memories cleared.");
  }
  async function removeCompanion() {
    if (!confirm(`Remove ${s.name} entirely - profile, memories and conversation? This can't be undone.`)) return;
    await fetch("/api/companion/profile", { method: "DELETE" }); router.push("/chat");
  }

  return (
    <div className={`cmp-setup cmp-settings cmp-bg-${s.appearance.background}`}>
      <aside className="cmp-setup-stage">
        <div className="cmp-stage-ring" aria-hidden />
        <div className="cmp-stage-face"><Avatar look={look} expression={voice.speaking ? "happy" : "calm"} speaking={voice.speaking} level={voice.level} intensity={s.appearance.animation} /></div>
        <div className="cmp-stage-name"><b>{s.name}</b><span>{avatar.tagline}</span></div>
      </aside>
      <section className="cmp-setup-panel">
        <h1 className="display cmp-setup-title">Companion settings</h1>
        <nav className="cmp-tabs" aria-label="Sections">{SECTIONS.map((x) => <button key={x} type="button" className={section === x ? "on" : ""} onClick={() => setSection(x)}>{x}</button>)}</nav>
        <div className="cmp-setup-body" key={section}>
          {section === "appearance" && (
            <div className="cmp-stack">
              <div className="cmp-label">Avatar</div><AvatarPicker s={s} patch={patch} />
              <div className="cmp-label">Style</div><StylePicker s={s} patch={patch} />
              <div className="cmp-label">Background</div><BackgroundPicker s={s} patch={patch} />
              <div className="cmp-label">Animation</div>
              <Segmented label="Animation intensity" value={s.appearance.animation} onChange={(v) => patch({ appearance: { ...s.appearance, animation: v } })} options={[{ id: "low", label: "Subtle" }, { id: "normal", label: "Natural" }, { id: "high", label: "Lively" }]} />
              <div className="cmp-label">Name</div>
              <input className="field" style={{ maxWidth: 240 }} maxLength={24} value={s.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Name" />
            </div>
          )}
          {section === "personality" && (<div className="cmp-stack"><PersonalityEditor s={s} patch={patch} /><div className="cmp-label">Conversation style</div><ConversationEditor s={s} patch={patch} /><div className="cmp-label">What they call you</div><AddressEditor s={s} patch={patch} displayName={displayName} /></div>)}
          {section === "voice" && <VoiceEditor s={s} patch={patch} providerAvailable={voiceProvider} onTry={(t) => { voice.speak(t); }} />}
          {section === "relationship" && <RelationshipEditor s={s} patch={patch} />}
          {section === "memory" && (
            <div className="cmp-stack">
              <p className="cmp-copy">{s.name} remembers {memoryCount === 0 ? "nothing yet" : `${memoryCount} thing${memoryCount === 1 ? "" : "s"}`}. Every one is listed, dated and deletable.</p>
              <label className="cmp-toggle"><input type="checkbox" checked={s.privacy.remember} onChange={(e) => patch({ privacy: { ...s.privacy, remember: e.target.checked } })} /> Let {s.name} keep memories</label>
              <div className="cmp-row"><a href="/companion/memory" className="btn">View memories</a><button type="button" className="btn" onClick={forgetAll}>Forget everything</button></div>
            </div>
          )}
          {section === "privacy" && (
            <div className="cmp-stack">
              <label className="cmp-toggle"><input type="checkbox" checked={s.privacy.storeHistory} onChange={(e) => patch({ privacy: { ...s.privacy, storeHistory: e.target.checked } })} /> Keep conversation history between sessions</label>
              <p className="muted cmp-note">Off: nothing you say to {s.name} is written down, so each session starts fresh. Mood, safety and check-in signals still work exactly as in the main chat.</p>
              <label className="cmp-toggle"><input type="checkbox" checked={s.voice.autoplay} onChange={(e) => patch({ voice: { ...s.voice, autoplay: e.target.checked } })} /> Read replies aloud automatically</label>
              <div className="cmp-label">Data controls</div>
              <div className="cmp-row"><button type="button" className="btn" onClick={clearHistory}>Delete conversation history</button><button type="button" className="btn" onClick={forgetAll}>Forget all memories</button><a href="/api/export" className="btn">Download everything</a><button type="button" className="btn cmp-danger" onClick={removeCompanion}>Remove companion</button></div>
            </div>
          )}
        </div>
        {msg && <p className="cmp-err" role="status">{msg}</p>}
        <div className="cmp-setup-nav">
          <a href="/companion" className="btn">Back</a>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"} <PxCheck className="pxicon" /></button>
        </div>
      </section>
    </div>
  );
}
