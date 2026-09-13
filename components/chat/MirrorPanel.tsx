"use client";
import { useState } from "react";
import type { UserView } from "@/lib/pipeline/userView";
import AxisWheel from "./AxisWheel";
import Sparkline from "./Sparkline";
import { PxRemove } from "../home/pixelIcons";
import type { usePush } from "../hooks/usePush";
import { NEARBY_HELP_URL } from "@/lib/safety/resources";
import { t } from "@/lib/i18n";

interface Props {
  mirror: UserView | null;
  onClose: () => void;
  onSettings: (body: Record<string, unknown>) => Promise<void>;
  onLogout: () => void;
  busy: boolean;
  push: ReturnType<typeof usePush>;
  lang?: string;
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
 * The Mirror, kept small on purpose: how you seem, what MindEase remembers, and the
 * switches. The detector maths, gate verdicts and safety log exist but are not
 * a thing a person needs in front of them while talking.
 */
export default function MirrorPanel({ mirror, onClose, onSettings, onLogout, busy, push, lang = "en" }: Props) {
  const [tab, setTab] = useState<"you" | "memory">("you");
  if (!mirror) return null;
  const m = mirror;
  const loc = lang === "en" ? "en-IN" : `${lang}-IN`;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col bg-clay-bg shadow-[-12px_0_30px_rgba(0,0,0,.5)]">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div>
          <h2 className="display text-xl">{t("mirrorTitle", lang)}</h2>
          <p className="text-xs text-clay-muted">{t("mirrorSub", lang)}</p>
        </div>
        <button className="clay-btn px-3 py-2" onClick={onClose} aria-label={t("closeMirror", lang)}><PxRemove className="pxicon" style={{ fontSize: 18 }} /></button>
      </header>
      <nav className="flex gap-1 px-5 pb-3">
        {(["you", "memory"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1.5 text-xs ${tab === k ? "bg-clay-slate text-clay-surface shadow-clay-sm" : "text-clay-muted"}`}>
            {k === "memory" ? t("tabMemories", lang) : t("tabYou", lang)}
          </button>
        ))}
      </nav>

      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto px-5 pb-8">
        {tab === "you" && (
          <>
            <Section title={t("howYouSeem", lang)} hint={t("seemHint", lang)}>
              <p className="text-sm">{m.seem.sentence}</p>
              {m.seem.states.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{m.seem.states.map((s) => <span key={s} className="clay-chip">{s}</span>)}</div>}
              {m.seem.why && <p className="mt-2 text-xs text-clay-muted">{m.seem.why}</p>}
            </Section>
            {m.octant && (
              <Section title={t("shapeToday", lang)} hint={t("shapeHint", lang)}>
                <AxisWheel weather={m.octant.weather} climate={m.octant.climate} />
              </Section>
            )}
            <Section title={t("screeningT", lang)} hint={t("screeningHint", lang)}>
              {m.screenings.length ? (
                <ul className="space-y-1 text-sm">{m.screenings.map((x) => <li key={x.at}><b>{x.name}</b> ({x.domain}) · {new Date(x.at).toLocaleDateString(loc)} · {x.score}/{x.max} · <span className="text-clay-coral">{x.band}</span></li>)}</ul>
              ) : <p className="text-xs text-clay-muted">{t("noneYetScreen", lang)}</p>}
              {m.signals.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-clay-muted">{m.signals.slice(0, 4).map((sg) => <li key={sg.domain}><span className="text-clay-ink">{t("consistentWith", lang, { domain: sg.domain })}</span> · {sg.evidence}</li>)}</ul>
              )}
              <div className="mt-3 flex flex-wrap gap-2"><a href="/summary" className="clay-btn inline-block px-3 py-1.5 text-xs">{t("summaryClin", lang)}</a><a href={NEARBY_HELP_URL} target="_blank" rel="noreferrer" className="clay-btn inline-block px-3 py-1.5 text-xs">{t("findNear", lang)}</a></div>
            </Section>
            {m.patterns.length > 0 && (
              <Section title={t("patternsT", lang)} hint={t("patternsHint", lang)}>
                <ul className="space-y-1 text-sm">{m.patterns.map((l) => <li key={l}>{l}</li>)}</ul>
              </Section>
            )}
            <Section title={t("moodRecent", lang)}>
              <Sparkline points={m.mood} />
            </Section>
            <Section title={t("wouldWrite", lang)}>
              <p className="text-sm">{m.checkin.wouldSend ? t("yes", lang) : t("notRightNow", lang)} <span className="text-xs text-clay-muted">— {m.checkin.reason}</span></p>
            </Section>
          </>
        )}

        {tab === "memory" && (
          <Section title={t("remembersT", lang, { n: String(m.memories.length) })} hint={t("remembersHint", lang)}>
            {m.memories.length ? (
              <ul className="space-y-2">
                {m.memories.map((mem) => (
                  <li key={mem.id} className="flex items-start gap-2 rounded-2xl bg-clay-bg-deep p-3">
                    <div className="flex-1 text-sm">
                      <div className="text-[10px] uppercase tracking-wider text-clay-muted">{mem.kind}{mem.era ? ` · ${mem.era}` : ""} · {new Date(mem.at).toLocaleDateString(loc)}</div>
                      {mem.text}
                    </div>
                    <button disabled={busy} onClick={() => onSettings({ forgetMemoryId: mem.id })} className="text-xs text-clay-muted hover:text-clay-coral" aria-label={t("forget", lang)}>{t("forget", lang)}</button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-clay-muted">{t("nothingYetMem", lang)}</p>}
          </Section>
        )}

        <Section title={t("behaviourT", lang)} hint={t("behaviourHint", lang)}>
          <ul className="space-y-1 text-sm">{m.behaviour.map((n) => <li key={n.key}>{n.text}</li>)}</ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => onSettings({ pauseDays: 3 })}>{t("space3", lang)}</button>
            {m.pausedUntil && m.pausedUntil > Date.now() && <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => onSettings({ pauseDays: null })}>{t("unpause", lang)}</button>}
            {push.supported && push.enabled && (push.subscribed
              ? <button className="clay-btn px-3 py-1.5 text-xs" onClick={() => push.unsubscribe()}>{t("stopNotify", lang)}</button>
              : <button className="clay-btn px-3 py-1.5 text-xs" onClick={async () => { const err = await push.subscribe(); if (err) alert(err); }}>{t("notify", lang)}</button>)}
          </div>
        </Section>
        <Section title={t("yourData", lang)}>
          <div className="flex flex-wrap gap-2">
            <a href="/api/export" className="clay-btn px-3 py-1.5 text-xs">{t("downloadAll", lang)}</a>
            <button disabled={busy} className="clay-btn px-3 py-1.5 text-xs" onClick={() => { if (confirm(t("deleteAllConfirm", lang))) onSettings({ clearAll: true }); }}>{t("deleteEverything", lang)}</button>
            <button className="clay-btn px-3 py-1.5 text-xs" onClick={onLogout}>{t("signOut", lang)}</button>
          </div>
        </Section>
      </div>
    </aside>
  );
}
