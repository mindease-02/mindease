"use client";
import { useState } from "react";
import type { UserView } from "@/lib/pipeline/userView";
import AxisWheel from "./AxisWheel";
import Sparkline from "./Sparkline";
import { PxRemove, PxDownload, PxBin, PxUser } from "../home/pixelIcons";

interface Props {
  mirror: UserView | null;
  onClose: () => void;
  onSettings: (body: Record<string, unknown>) => Promise<void>;
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


/**
 * The Mirror, kept small on purpose: how you seem, what Ori remembers, and the
 * switches. The detector maths, gate verdicts and safety log exist but are not
 * a thing a person needs in front of them while talking.
 */
export default function MirrorPanel({ mirror, onClose, onSettings, onLogout, busy }: Props) {
  const [tab, setTab] = useState<"you" | "memory">("you");
  if (!mirror) return null;
  const m = mirror;
  const c = m.consent;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col bg-clay-bg shadow-[-12px_0_30px_rgba(0,0,0,.5)]">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div>
          <h2 className="display text-xl">The Mirror</h2>
          <p className="text-xs text-clay-muted">What Ori has of you. Yours to read and delete.</p>
        </div>
        <button className="clay-btn px-3 py-2" onClick={onClose} aria-label="Close the Mirror"><PxRemove className="pxicon" style={{ fontSize: 18 }} /></button>
      </header>
      <nav className="flex gap-1 px-5 pb-3">
        {(["you", "memory"] as const).map((t) => (
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
            <Section title="Screening" hint="Short checks doctors use, when the pattern warrants one. A range, not a diagnosis.">
              {m.screenings.length ? (
                <ul className="space-y-1 text-sm">{m.screenings.map((x) => <li key={x.at}><b>{x.name}</b> ({x.domain}) · {new Date(x.at).toLocaleDateString()} · {x.score}/{x.max} · <span className="text-clay-coral">{x.band}</span></li>)}</ul>
              ) : <p className="text-xs text-clay-muted">None yet. Ori offers one when it's warranted; you can also ask for "the mood check", "the anxiety check" or "the sleep check" in the chat.</p>}
              {m.signals.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-clay-muted">{m.signals.slice(0, 4).map((sg) => <li key={sg.domain}><span className="text-clay-ink">Consistent with {sg.domain}</span> · {sg.evidence}</li>)}</ul>
              )}
              <a href="/summary" className="clay-btn mt-3 inline-block px-3 py-1.5 text-xs">One-page summary for a clinician</a>
            </Section>
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

        <Section title="How Ori is behaving" hint="Ori sets this itself from your own patterns. It changes as it learns you.">
          <ul className="space-y-1 text-sm">{m.behaviour.map((n) => <li key={n.key}>{n.text}</li>)}</ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => onSettings({ pauseDays: 3 })}>Give me 3 days of space</button>
            {m.pausedUntil && m.pausedUntil > Date.now() && <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => onSettings({ pauseDays: null })}>Unpause</button>}
          </div>
        </Section>
        <Section title="Your data">
          <div className="flex flex-wrap gap-2">
            <a href="/api/export" className="clay-btn px-3 py-1.5 text-xs">Download everything</a>
            <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => { if (confirm("Delete all history, memories and messages? This can't be undone.")) onSettings({ clearAll: true }); }}>Delete everything</button>
            <button className="clay-btn px-3 py-1.5 text-xs" onClick={onLogout}>Sign out</button>
          </div>
        </Section>
      </div>
    </aside>
  );
}
