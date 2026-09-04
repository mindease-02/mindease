import "../home.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import { getStore, migrate } from "@/lib/store";
import { INSTRUMENTS, bandFor } from "@/lib/screening/instruments";
import { patternReport } from "@/lib/screening";
import { lifestylePatterns } from "@/lib/lifestyle/patterns";
import { helplinesFor } from "@/lib/safety/resources";
import PrintButton from "@/components/PrintButton";

/**
 * A one-page summary the person can print or show to a clinician: screening
 * scores over time, the behavioural patterns Ori has observed, and helplines.
 * It says, in the first line, that it is not a diagnosis.
 */
export default async function SummaryPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const raw = await getStore().get(session.userId);
  if (!raw) redirect("/mood");
  const state = migrate(raw);
  const now = Date.now();
  const done = (state.screenings ?? []).filter((s) => s.completedAt).sort((a, b) => b.completedAt! - a.completedAt!);
  const patterns = patternReport(state, now);
  const life = lifestylePatterns(state.history, state.timeZone, now);
  const days = new Set(state.history.map((p) => new Date(p.at).toDateString())).size;
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={`world summary ${display.variable} ${heading.variable} ${body.variable}`}>
      <div className="atmos" aria-hidden /><div className="grain" aria-hidden />
      <header className="nav no-print"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/chat" className="btn" style={{ padding: "10px 18px" }}>← Back to chat</Link>
        <PrintButton />
      </div></header>
      <main className="container sheet" id="main">
        <div className="sticker alt">Screening summary · not a diagnosis</div>
        <h1 className="display" style={{ fontSize: "clamp(1.4rem, 3vw, 2.2rem)", margin: "14px 0 6px" }}>{session.name}'s summary from MindEase</h1>
        <p className="muted">Prepared {fmt(now)} from {days} days of conversation. Everything below is a screening signal, produced by software; only a clinician can assess or diagnose. Bring this to a doctor, a psychologist, or Tele-MANAS if it helps you explain.</p>

        <h2 className="display sheet-h">Screening scores</h2>
        {done.length ? (
          <table className="sheet-table">
            <thead><tr><th>Instrument</th><th>Date</th><th>Score</th><th>Range</th></tr></thead>
            <tbody>{done.map((s, i) => { const inst = INSTRUMENTS[s.instrument]; return (
              <tr key={i}><td>{inst.name} <span className="muted">({inst.domain})</span></td><td>{fmt(s.completedAt!)}</td><td>{s.score} / {inst.max}</td><td>{bandFor(inst, s.score!).label}{inst.crisisItem !== undefined && (s.answers[inst.crisisItem] ?? 0) > 0 ? " · item 9 positive" : ""}</td></tr>
            ); })}</tbody>
          </table>
        ) : <p className="muted">No screenings completed yet. Ori offers one when the pattern warrants it; you can also ask for one in the chat.</p>}

        <h2 className="display sheet-h">Patterns observed (last 14 days)</h2>
        {patterns.length ? (
          <ul className="sheet-list">{patterns.map((p) => <li key={p.domain}><b>{p.domain}</b> <span className="bar" aria-hidden><i style={{ width: `${p.strength * 100}%` }} /></span> <span className="muted">{p.evidence}</span></li>)}</ul>
        ) : <p className="muted">Not enough recent conversation to say anything reliable.</p>}
        {life.sufficient && <><h2 className="display sheet-h">Daily rhythm</h2><ul className="sheet-list">{life.lines.map((l) => <li key={l}>{l}</li>)}</ul></>}

        <h2 className="display sheet-h">Where to take this</h2>
        <ul className="sheet-list">{helplinesFor(state.region).map((h) => <li key={h.name}><b>{h.name}</b> — {h.contact}{h.note ? ` (${h.note})` : ""}</li>)}</ul>
        <p className="muted" style={{ marginTop: 24, fontSize: ".8rem" }}>MindEase is software, not a clinician. Screening instruments: PHQ-9 and GAD-7 (Pfizer, free for use), ISI (items paraphrased). Scores are self-reported answers; patterns are estimates from language and timing and can be wrong.</p>
      </main>
    </div>
  );
}
