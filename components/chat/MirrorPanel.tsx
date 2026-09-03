"use client";
import { useState } from "react";
import type { MirrorView } from "@/lib/pipeline/mirror";
import AxisWheel from "./AxisWheel";
import Sparkline from "./Sparkline";

interface Props {
  mirror: MirrorView | null;
  onClose: () => void;
  onSettings: (body: Record<string, unknown>) => Promise<void>;
  onPreview: (kind: string) => Promise<void>;
  onLogout: () => void;
  busy: boolean;
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

export default function MirrorPanel({ mirror, onClose, onSettings, onPreview, onLogout, busy }: Props) {
  const [tab, setTab] = useState<"read" | "checkins" | "memory" | "settings">("read");
  if (!mirror) return null;
  const m = mirror;
  const c = m.consent;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col bg-clay-bg shadow-[-12px_0_30px_rgba(89,70,55,.18)]">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div>
          <h2 className="font-serif text-xl">The Mirror</h2>
          <p className="text-xs text-clay-muted">Everything Ori currently believes about you. Yours to read and delete.</p>
        </div>
        <button className="clay-btn px-3 py-2" onClick={onClose} aria-label="close">✕</button>
      </header>
      <nav className="flex gap-1 px-5 pb-3">
        {(["read", "checkins", "memory", "settings"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 text-xs capitalize ${tab === t ? "bg-clay-slate text-clay-surface shadow-clay-sm" : "text-clay-muted"}`}>
            {t === "checkins" ? "check-ins" : t}
          </button>
        ))}
      </nav>

      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-5 pb-8">
        {tab === "read" && (
          <>
            <Section title="Mood over recent turns" hint="Valence, -1 to +1. Dots fade with low confidence.">
              <Sparkline points={m.mood.points} />
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-clay-muted">
                <span className="clay-chip">now {m.mood.now ?? "–"}</span>
                <span className="clay-chip">baseline {m.mood.baseline ?? "–"}</span>
                <span className="clay-chip">momentum {m.mood.momentum}</span>
              </div>
            </Section>
            <Section title="Eight axes" hint="Coral: today. Blue: your recent climate.">
              {m.octant ? (
                <>
                  <AxisWheel weather={m.octant.weather} climate={m.octant.climate} />
                  <p className="mt-2 text-xs text-clay-muted">{m.octant.summary}</p>
                  {m.octant.shift.length > 0 && <p className="mt-1 text-xs text-clay-muted">Moved today: {m.octant.shift.map((s) => `${s.axis} ${s.delta > 0 ? "↑" : "↓"}`).join(", ")}</p>}
                </>
              ) : <p className="text-xs text-clay-muted">Say something first.</p>}
            </Section>
            <Section title="Last read" hint="Model-based. A hypothesis, not a verdict - correct it in the chat.">
              {m.analysis ? (
                <div className="space-y-2 text-sm">
                  {m.analysis.states.length > 0 && <div className="flex flex-wrap gap-1.5">{m.analysis.states.map((s) => <span key={s.name} className="clay-chip">{s.name} {(s.intensity * 100).toFixed(0)}%</span>)}</div>}
                  {m.analysis.why && <p className="text-clay-muted"><span className="text-clay-ink">Why, from your side:</span> {m.analysis.why}</p>}
                  <p className="text-xs text-clay-muted">
                    Surface {m.analysis.expressed.valence.toFixed(2)} · underneath {m.analysis.feeling.valence.toFixed(2)} · masking {(m.analysis.masking * 100).toFixed(0)}%
                    {m.analysis.maskingNote && <> — {m.analysis.maskingNote}</>}
                  </p>
                  <p className="text-xs text-clay-muted">Seems to want: {m.analysis.need} · intensity {(m.analysis.intensity * 100).toFixed(0)}% · source: {m.analysis.source}</p>
                </div>
              ) : <p className="text-xs text-clay-muted">Nothing yet.</p>}
            </Section>
            <Section title="Trend" hint={`${m.trend.historyPoints} points tracked. Needs 12+ over 5+ days before it says anything.`}>
              {m.trend.sufficient ? (
                <>
                  <p className="text-sm">Signal {m.trend.score.toFixed(2)} · {m.trend.agreement}/4 detectors agree</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-clay-muted">{m.trend.evidence.map((e, i) => <li key={i}>{e}</li>)}{!m.trend.evidence.length && <li>nothing notable</li>}</ul>
                </>
              ) : <p className="text-xs text-clay-muted">Not enough history yet - and it won&apos;t guess.</p>}
            </Section>
            <Section title="Reliance" hint="Goes up when you're here more and mentioning people less. Ori pulls back when it climbs.">
              <p className="text-sm capitalize">{m.dependency.tier} <span className="text-xs text-clay-muted">({m.dependency.index})</span></p>
              <ul className="mt-1 list-disc pl-4 text-xs text-clay-muted">{m.dependency.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </Section>
          </>
        )}

        {tab === "checkins" && (
          <>
            <Section title="Would Ori reach out right now?" hint="Every gate, in order. One 'no' is enough.">
              <p className="text-sm">{m.checkin.wouldSend ? `Yes - a "${m.checkin.kind}" message` : `No${m.checkin.blockedBy ? ` - stopped by: ${m.checkin.blockedBy.replace(/_/g, " ")}` : ""}`}</p>
              <ul className="mt-2 space-y-1">
                {m.checkin.gates.map((g) => (
                  <li key={g.name} className="flex gap-2 text-xs">
                    <span className={g.passed ? "text-clay-sage-shade" : "text-clay-coral"}>{g.passed ? "●" : "○"}</span>
                    <span><span className="text-clay-ink">{g.name.replace(/_/g, " ")}</span> <span className="text-clay-muted">— {g.detail}</span></span>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Preview a check-in" hint="Sends one now, without touching your budget. So you can see what each kind sounds like.">
              <div className="flex flex-wrap gap-1.5">
                {["morning", "evening", "inactivity", "observation", "callback", "light_touch", "bridge"].map((k) => (
                  <button key={k} disabled={busy} onClick={() => onPreview(k)} className="clay-btn px-3 py-1.5 text-xs">{k.replace("_", " ")}</button>
                ))}
              </div>
            </Section>
            <Section title="What has landed" hint="Which kinds of check-in have helped you, learned over time. Reward is mood trajectory, never engagement.">
              <ul className="text-xs text-clay-muted">{m.bandit.map((b) => <li key={b.kind} className="flex justify-between py-0.5"><span>{b.kind.replace("_", " ")}</span><span>{(b.mean * 100).toFixed(0)}% · {b.pulls} sent</span></li>)}</ul>
            </Section>
            <Section title="Recent unprompted messages">
              {m.outreach.length ? (
                <ul className="text-xs text-clay-muted">{m.outreach.map((o) => <li key={o.at} className="py-0.5">{new Date(o.at).toLocaleString()} · {o.kind.replace("_", " ")}{o.engaged === true ? " · answered" : o.engaged === false ? " · ignored" : ""}{o.rejected ? " · marked unhelpful" : ""}</li>)}</ul>
              ) : <p className="text-xs text-clay-muted">None yet.</p>}
            </Section>
          </>
        )}

        {tab === "memory" && (
          <Section title={`What Ori remembers (${m.memories.length})`} hint="Short facts, extracted from what you said. Delete any of them.">
            {m.memories.length ? (
              <ul className="space-y-2">
                {m.memories.map((mem) => (
                  <li key={mem.id} className="flex items-start gap-2 rounded-2xl bg-clay-bg-deep p-3 shadow-clay-in">
                    <div className="flex-1 text-sm">
                      <div className="text-[10px] uppercase tracking-wider text-clay-muted">{mem.kind}{mem.era ? ` · ${mem.era}` : ""} · {new Date(mem.at).toLocaleDateString()}{mem.recallCount ? ` · recalled ${mem.recallCount}×` : ""}</div>
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
            <Section title="Unprompted check-ins">
              <Toggle label="Let Ori reach out first" value={c.enabled} onChange={(v) => onSettings({ consent: { enabled: v } })} />
              <Toggle label="Mornings" hint="One short opener between 08:00 and 11:00, if you haven't written yet." value={c.cadence.morning} onChange={(v) => onSettings({ consent: { cadence: { morning: v } } })} />
              <Toggle label="Isolated evenings" hint="Between 18:00 and 21:30, only when the day read as isolated." value={c.cadence.evening} onChange={(v) => onSettings({ consent: { cadence: { evening: v } } })} />
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span>After silence<span className="block text-xs text-clay-muted">Hours before one nudge. 0 = never.</span></span>
                <input type="number" min={0} max={240} className="clay-input w-20 py-1.5 text-center" defaultValue={c.cadence.inactivityHours} onBlur={(e) => onSettings({ consent: { cadence: { inactivityHours: Number(e.target.value) } } })} />
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span>Max per day</span>
                <input type="number" min={0} max={6} className="clay-input w-20 py-1.5 text-center" defaultValue={c.dailyMax} onBlur={(e) => onSettings({ consent: { dailyMax: Number(e.target.value) } })} />
              </div>
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span>Max per week</span>
                <input type="number" min={0} max={21} className="clay-input w-20 py-1.5 text-center" defaultValue={c.weeklyBudget} onBlur={(e) => onSettings({ consent: { weeklyBudget: Number(e.target.value) } })} />
              </div>
              <div className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span>Quiet hours<span className="block text-xs text-clay-muted">{c.timeZone}</span></span>
                <div className="flex items-center gap-1">
                  <input type="number" min={0} max={23.5} step={0.5} className="clay-input w-16 py-1.5 text-center" defaultValue={c.quietFrom} onBlur={(e) => onSettings({ consent: { quietFrom: Number(e.target.value) } })} />
                  <span className="text-clay-muted">→</span>
                  <input type="number" min={0} max={23.5} step={0.5} className="clay-input w-16 py-1.5 text-center" defaultValue={c.quietTo} onBlur={(e) => onSettings({ consent: { quietTo: Number(e.target.value) } })} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => onSettings({ pauseDays: 3 })}>Pause for 3 days</button>
                {m.pausedUntil && m.pausedUntil > Date.now() && <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => onSettings({ pauseDays: null })}>Unpause (paused until {new Date(m.pausedUntil).toLocaleDateString()})</button>}
              </div>
            </Section>
            <Section title="Signals" hint="Each is off until you turn it on. Raw audio and keystrokes never leave your device - only ~10 aggregate numbers do.">
              <Toggle label="Voice tone" hint="Pitch range, pace, pauses, loudness - relative to your own baseline." value={c.voiceSignals} onChange={(v) => onSettings({ consent: { voiceSignals: v } })} />
              <Toggle label="Typing rhythm" hint="Speed, hesitation, deleting-and-rewriting. Never which keys." value={c.typingSignals} onChange={(v) => onSettings({ consent: { typingSignals: v } })} />
              <Toggle label="Let Ori mention them" hint="Whether it may say 'you sound flatter than usual' out loud." value={c.allowBehaviouralSignals} onChange={(v) => onSettings({ consent: { allowBehaviouralSignals: v } })} />
              <Toggle label="Keep conversation history" hint="Off = only mood points are kept; Ori forgets the words between sessions." value={c.storeTranscript} onChange={(v) => onSettings({ consent: { storeTranscript: v } })} />
            </Section>
            <Section title="Crisis lines shown for">
              <select className="clay-input" defaultValue={m.helplines[0]?.region === "*" ? "" : m.helplines[0]?.region} onChange={(e) => onSettings({ region: e.target.value })}>
                <option value="">Not set (global list)</option>
                {["US", "GB", "IE", "IN", "AU", "CA", "NZ", "DE", "FR", "ZA"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Section>
            <Section title="Your data">
              <div className="flex flex-wrap gap-2">
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
