"use client";
/**
 * The controls that shape a companion, shared by the setup flow and the
 * settings page so the two can never drift apart.
 */
import { AVATARS, avatarById, resolveLook } from "@/lib/companion/avatars";
import { VOICES } from "@/lib/companion/voices";
import { BACKGROUNDS, RELATIONSHIPS, type CompanionSettings, type PersonalityConfig } from "@/lib/companion/types";
import Avatar from "./Avatar";

export type Patch = (p: Partial<CompanionSettings> | ((s: CompanionSettings) => CompanionSettings)) => void;

const TRAITS: { key: keyof PersonalityConfig; left: string; right: string }[] = [
  { key: "energy", left: "Calm", right: "Energetic" },
  { key: "playful", left: "Serious", right: "Playful" },
  { key: "talkative", left: "Quiet", right: "Talkative" },
  { key: "emotional", left: "Logical", right: "Emotional" },
  { key: "expressive", left: "Reserved", right: "Expressive" },
  { key: "gentle", left: "Direct", right: "Gentle" },
  { key: "funny", left: "Serious", right: "Funny" },
];

export function AvatarPicker({ s, patch }: { s: CompanionSettings; patch: Patch }) {
  return (
    <div className="cmp-grid" role="radiogroup" aria-label="Avatar">
      {AVATARS.map((a) => {
        const on = s.appearance.avatarId === a.id;
        return (
          <button key={a.id} type="button" role="radio" aria-checked={on} className={`cmp-card ${on ? "on" : ""}`}
            onClick={() => patch((cur) => ({ ...cur, name: cur.name === avatarById(cur.appearance.avatarId).name ? a.name : cur.name, appearance: { ...cur.appearance, avatarId: a.id, style: a.styles[0].id }, personality: { ...a.personality }, voice: { ...cur.voice, voiceId: a.voices[0] }, interests: [...a.interests] }))}>
            <div className="cmp-card-face"><Avatar look={a.look} expression={on ? "happy" : "neutral"} intensity="low" gaze={on} /></div>
            <b>{a.name}</b>
            <span className="cmp-card-pres">{a.presentation === "female" ? "girl" : "boy"}</span>
            <small>{a.tagline}</small>
          </button>
        );
      })}
    </div>
  );
}

export function StylePicker({ s, patch }: { s: CompanionSettings; patch: Patch }) {
  const a = avatarById(s.appearance.avatarId);
  if (a.look.portrait) return null;
  return (
    <div className="cmp-row">
      {a.styles.map((st) => (
        <button key={st.id} type="button" className={`cmp-chip ${s.appearance.style === st.id ? "on" : ""}`} onClick={() => patch({ appearance: { ...s.appearance, style: st.id } })}>
          <span className="cmp-chip-face"><Avatar look={resolveLook(a, st.id)} intensity="low" gaze={false} /></span>{st.label}
        </button>
      ))}
    </div>
  );
}

export function BackgroundPicker({ s, patch }: { s: CompanionSettings; patch: Patch }) {
  return (
    <div className="cmp-row">
      {BACKGROUNDS.map((b) => (
        <button key={b.id} type="button" className={`cmp-chip cmp-bg-${b.id} ${s.appearance.background === b.id ? "on" : ""}`} onClick={() => patch({ appearance: { ...s.appearance, background: b.id } })}>{b.label}</button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; hint?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="cmp-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={value === o.id ? "on" : ""} onClick={() => onChange(o.id)} title={o.hint}>{o.label}</button>
      ))}
    </div>
  );
}

export function PersonalityEditor({ s, patch }: { s: CompanionSettings; patch: Patch }) {
  return (
    <div className="cmp-sliders">
      {TRAITS.map((t) => (
        <label key={t.key} className="cmp-slider">
          <span>{t.left}</span>
          <input type="range" min={0} max={100} value={Math.round(s.personality[t.key] * 100)} aria-label={`${t.left} to ${t.right}`}
            onChange={(e) => patch({ personality: { ...s.personality, [t.key]: Number(e.target.value) / 100 } })} />
          <span>{t.right}</span>
        </label>
      ))}
    </div>
  );
}

export function ConversationEditor({ s, patch }: { s: CompanionSettings; patch: Patch }) {
  const c = s.conversation;
  const set = (p: Partial<CompanionSettings["conversation"]>) => patch({ conversation: { ...c, ...p } });
  return (
    <div className="cmp-stack">
      <div><div className="cmp-label">Reply length</div><Segmented label="Reply length" value={c.length} onChange={(v) => set({ length: v })} options={[{ id: "short", label: "Short texts" }, { id: "normal", label: "Normal" }, { id: "long", label: "Long, thoughtful" }]} /></div>
      <div><div className="cmp-label">Questions</div><Segmented label="Questions" value={c.questions} onChange={(v) => set({ questions: v })} options={[{ id: "lots", label: "Lots of questions" }, { id: "balanced", label: "Balanced" }, { id: "listening", label: "Mostly listening" }]} /></div>
      <div><div className="cmp-label">Register</div><Segmented label="Register" value={c.casual ? "casual" : "proper"} onChange={(v) => set({ casual: v === "casual" })} options={[{ id: "casual", label: "Casual texting" }, { id: "proper", label: "Proper sentences" }]} /></div>
      <div><div className="cmp-label">Expression</div><Segmented label="Expression" value={c.expressive ? "more" : "less"} onChange={(v) => set({ expressive: v === "more" })} options={[{ id: "more", label: "More expressive" }, { id: "less", label: "Understated" }]} /></div>
      <div><div className="cmp-label">Emojis</div><Segmented label="Emojis" value={c.emojis} onChange={(v) => set({ emojis: v })} options={[{ id: "none", label: "None" }, { id: "some", label: "Minimal" }, { id: "lots", label: "Frequent" }]} /></div>
    </div>
  );
}

export function AddressEditor({ s, patch, displayName }: { s: CompanionSettings; patch: Patch; displayName: string }) {
  const first = displayName.split(" ")[0];
  const suggestions = Array.from(new Set([first.slice(0, 3), first.length > 4 ? first.slice(0, 4) : `${first}y`, "mate", "friend"])).filter((x) => x && x.toLowerCase() !== first.toLowerCase());
  const a = s.address;
  return (
    <div className="cmp-stack">
      <Segmented label="What they call you" value={a.mode} onChange={(v) => patch({ address: { mode: v, nickname: v === "nickname" ? suggestions[0] : v === "custom" ? a.nickname ?? "" : undefined } })}
        options={[{ id: "first", label: first }, { id: "nickname", label: "A nickname" }, { id: "custom", label: "Custom" }, { id: "none", label: "No name" }]} />
      {a.mode === "nickname" && (
        <div className="cmp-row">{suggestions.map((n) => <button key={n} type="button" className={`cmp-chip ${a.nickname === n ? "on" : ""}`} onClick={() => patch({ address: { mode: "nickname", nickname: n } })}>{n}</button>)}</div>
      )}
      {a.mode === "custom" && (
        <input className="field" maxLength={24} placeholder="what should they call you?" value={a.nickname ?? ""} onChange={(e) => patch({ address: { mode: "custom", nickname: e.target.value } })} />
      )}
    </div>
  );
}

export function VoiceEditor({ s, patch, onTry, providerAvailable }: { s: CompanionSettings; patch: Patch; onTry?: (text: string) => void; providerAvailable: boolean | null }) {
  const a = avatarById(s.appearance.avatarId);
  const v = s.voice;
  const set = (p: Partial<CompanionSettings["voice"]>) => patch({ voice: { ...v, ...p } });
  const ordered = [...VOICES].sort((x, y) => Number(a.voices.includes(y.id)) - Number(a.voices.includes(x.id)));
  return (
    <div className="cmp-stack">
      <div className="cmp-row">
        {ordered.map((o) => (
          <button key={o.id} type="button" className={`cmp-chip ${v.voiceId === o.id ? "on" : ""}`} onClick={() => set({ voiceId: o.id })} title={o.blurb}>
            {o.label} <em>{o.presentation === "female" ? "f" : o.presentation === "male" ? "m" : "·"}</em>
          </button>
        ))}
      </div>
      <label className="cmp-slider"><span>Slower</span><input type="range" min={70} max={130} value={Math.round(v.speed * 100)} aria-label="Speaking speed" onChange={(e) => set({ speed: Number(e.target.value) / 100 })} /><span>Faster</span></label>
      <label className="cmp-slider"><span>Soft</span><input type="range" min={0} max={100} value={Math.round(v.energy * 100)} aria-label="Voice energy" onChange={(e) => set({ energy: Number(e.target.value) / 100 })} /><span>Lively</span></label>
      <label className="cmp-slider"><span>Quiet</span><input type="range" min={0} max={100} value={Math.round(v.volume * 100)} aria-label="Volume" onChange={(e) => set({ volume: Number(e.target.value) / 100 })} /><span>Loud</span></label>
      <div className="cmp-row" style={{ alignItems: "center" }}>
        {onTry && <button type="button" className="btn" onClick={() => onTry(`hey. it's ${s.name}. this is what i sound like.`)}>Hear it</button>}
        <label className="cmp-toggle"><input type="checkbox" checked={v.autoplay} onChange={(e) => set({ autoplay: e.target.checked })} /> Read replies aloud automatically</label>
      </div>
      <p className="muted cmp-note">{providerAvailable === false ? "No voice service is configured on this deployment, so your browser's built-in voice is used. Text always works." : providerAvailable ? "Voice is generated on the server; the key never reaches your browser." : ""}</p>
    </div>
  );
}

export function RelationshipEditor({ s, patch }: { s: CompanionSettings; patch: Patch }) {
  return (
    <div className="cmp-grid cmp-grid-tight" role="radiogroup" aria-label="Relationship style">
      {RELATIONSHIPS.map((r) => (
        <button key={r.id} type="button" role="radio" aria-checked={s.relationship === r.id} className={`cmp-card cmp-card-text ${s.relationship === r.id ? "on" : ""}`} onClick={() => patch({ relationship: r.id })}>
          <b>{r.label}</b><small>{r.blurb}</small>
        </button>
      ))}
    </div>
  );
}
