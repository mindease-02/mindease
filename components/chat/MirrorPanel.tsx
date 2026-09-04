"use client";
import { useState } from "react";
import type { UserView } from "@/lib/pipeline/userView";
import AxisWheel from "./AxisWheel";
import Sparkline from "./Sparkline";

interface Props {
  mirror: UserView | null;
  onClose: () => void;
  onSettings: (body: Record<string, unknown>) => Promise<void>;
  onLogout: () => void;
  busy: boolean;
  push: { supported: boolean; enabled: boolean; subscribed: boolean; subscribe: () => Promise<string | null>; unsubscribe: () => Promise<void> };
  onToast: (t: string) => void;
}

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="clay-sm p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-widest text-clay-muted">{title}</h3>
      {hint && <p className="mt-1 text-xs text-clay-muted/80">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1.5">
      <span className="text-sm">{label}{hint && <span className="block text-xs text-clay-muted">{hint}</span>}</span>
      <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full shadow-clay-in transition-colors ${value ? "bg-clay-coral" : "bg-clay-bg-deep"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-clay-surface shadow-clay-sm transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

/**
 * The Mirror, kept small on purpose: how you seem, what Ori remembers, and the
 * switches. The detector maths, gate verdicts and safety log exist but are not
 * a thing a person needs in front of them while talking.
 */
export default function MirrorPanel({ mirror, onClose, onSettings, onLogout, busy, push, onToast }: Props) {
  const [tab, setTab] = useState<"you" | "memory" | "settings">("you");
  if (!mirror) return null;
  const m = mirror;
  const c = m.consent;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col bg-clay-bg shadow-[-12px_0_30px_rgba(0,0,0,.5)]">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div>
          <h2 className="display text-xl">The Mirror</h2>
          <p className="text-xs text-clay-muted">What Ori has of you. Yours to read, change and delete.</p>
        </div>
        <button className="clay-btn px-3 py-2" onClick={onClose} aria-label="close">✕</button>
      </header>
      <nav className="flex gap-1 px-5 pb-3">
        {(["you", "memory", "settings"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 text-xs capitalize ${tab === t ? "bg-clay-slate text-clay-surface shadow-clay-sm" : "text-clay-muted"}`}>
            {t === "memory" ? "memories" : t}
          </button>
        ))}
      </nav>

      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-5 pb-8">
        {tab === "you" && (
          <>
            <Section title="How you seem right now" hint="A guess, not a verdict. Correct it in the chat.">
              <p className="text-sm">{m.seem.sentence}</p>
              {m.seem.states.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{m.seem.states.map((s) => <span key={s} className="clay-chip">{s}</span>)}</div>}
              {m.seem.why && <p className="mt-2 text-xs text-clay-muted">{m.seem.why}</p>}
            </Section>
            {m.octant && (
              <Section title="Your shape today" hint="Brighter: today. Softer: the last few days.">
                <AxisWheel weather={m.octant.weather} climate={m.octant.climate} />
              </Section>
            )}
            {m.patterns.length > 0 && (
              <Section title="Your patterns" hint="From when you tend to talk, not what you say. Ori uses this to anticipate, not to judge.">
                <ul className="space-y-1 text-sm">{m.patterns.map((l) => <li key={l}>{l}</li>)}</ul>
              </Section>
            )}
            <Section title="Mood across recent conversations">
              <Sparkline points={m.mood} />
            </Section>
            <Section title="Would Ori write to you first today?">
              <p className="text-sm">{m.checkin.wouldSend ? "Yes" : "Not right now"} <span className="text-xs text-clay-muted">— {m.checkin.reason}</span></p>
            </Section>
          </>
        )}

        {tab === "memory" && (
          <Section title={`What Ori remembers (${m.memories.length})`} hint="Short facts from what you've said. Delete any of them.">
            {m.memories.length ? (
              <ul className="space-y-2">
                {m.memories.map((mem) => (
                  <li key={mem.id} className="flex items-start gap-2 rounded-2xl bg-clay-bg-deep p-3">
                    <div className="flex-1 text-sm">
                      <div className="text-[10px] uppercase tracking-wider text-clay-muted">{mem.kind}{mem.era ? ` · ${mem.era}` : ""} · {new Date(mem.at).toLocaleDateString()}</div>
                      {mem.text}
                    </div>
                    <button disabled={busy} onClick={() => onSettings({ forgetMemoryId: mem.id })} className="text-xs text-clay-muted hover:text-clay-coral" aria-label="forget">forget</button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-clay-muted">Nothing yet. It only keeps what a good friend would remember next week.</p>}
          </Section>
        )}

        {tab === "settings" && (
          <>
            <Section title="Check-ins">
              <Toggle label="Let Ori write to me first" value={c.enabled} onChange={(v) => onSettings({ consent: { enabled: v } })} />
              <Toggle label="Mornings" value={c.cadence.morning} onChange={(v) => onSettings({ consent: { cadence: { morning: v } } })} />
              <Toggle label="Quiet evenings" hint="Only when the day looked isolated." value={c.cadence.evening} onChange={(v) => onSettings({ consent: { cadence: { evening: v } } })} />
              <Toggle label="After a long silence" value={c.cadence.inactivityHours > 0} onChange={(v) => onSettings({ consent: { cadence: { inactivityHours: v ? 36 : 0 } } })} />
              <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span>Quiet hours<span className="block text-xs text-clay-muted">{c.timeZone}</span></span>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} max={23.5} step={0.5} className="clay-input w-16 py-1.5 text-center" defaultValue={c.quietFrom} onBlur={(e) => onSettings({ consent: { quietFrom: Number(e.target.value) } })} />
                  <span className="text-clay-muted">→</span>
                  <input type="number" min={0} max={23.5} step={0.5} className="clay-input w-16 py-1.5 text-center" defaultValue={c.quietTo} onBlur={(e) => onSettings({ consent: { quietTo: Number(e.target.value) } })} />
                </div>
              </div>
              <Toggle label="Notify me when the tab is closed" hint={!push.supported ? "Not supported in this browser." : !push.enabled ? "Not set up on the server yet." : `${m.pushDevices} device${m.pushDevices === 1 ? "" : "s"} registered.`}
                value={push.subscribed} onChange={async (v) => { if (v) { const err = await push.subscribe(); if (err) onToast(err); } else await push.unsubscribe(); await onSettings({}); }} />
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => onSettings({ pauseDays: 3 })}>Give me 3 days of space</button>
                {m.pausedUntil && m.pausedUntil > Date.now() && <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => onSettings({ pauseDays: null })}>Unpause</button>}
              </div>
            </Section>
            <Section title="What Ori may read" hint="Off until you turn it on. Raw audio, keystrokes and camera frames never leave your device.">
              <Toggle label="Tone of voice" value={c.voiceSignals} onChange={(v) => onSettings({ consent: { voiceSignals: v } })} />
              <Toggle label="Typing rhythm" value={c.typingSignals} onChange={(v) => onSettings({ consent: { typingSignals: v } })} />
              <Toggle label="Expression (camera)" value={c.faceSignals} onChange={(v) => onSettings({ consent: { faceSignals: v } })} />
              <Toggle label="Let it mention them" hint="Whether Ori may say 'you sound flatter than usual'." value={c.allowBehaviouralSignals} onChange={(v) => onSettings({ consent: { allowBehaviouralSignals: v } })} />
              <Toggle label="Keep conversation history" hint="Off = Ori forgets the words between sessions." value={c.storeTranscript} onChange={(v) => onSettings({ consent: { storeTranscript: v } })} />
            </Section>
            <Section title="Crisis lines shown for">
              <select className="clay-input" defaultValue={m.region ?? "IN"} onChange={(e) => onSettings({ region: e.target.value })}>
                {["IN", "US", "GB", "IE", "AU", "CA", "NZ", "DE", "FR", "ZA"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Section>
            <Section title="Your data">
              <div className="flex flex-wrap gap-2">
                <a href="/api/export" className="clay-btn px-3 py-1.5 text-xs">Download everything</a>
                <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => { if (confirm("Delete all history, memories and messages? This can't be undone.")) onSettings({ clearAll: true }); }}>Delete everything</button>
                <button className="clay-btn px-3 py-1.5 text-xs" onClick={onLogout}>Sign out</button>
              </div>
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}
