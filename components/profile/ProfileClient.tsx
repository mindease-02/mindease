"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES, t } from "@/lib/i18n";
import { PxArrow, PxDownload, PxBin, PxCheck } from "../home/pixelIcons";
import type { WeeklyReflection } from "@/lib/reflection";
import WeekCard from "../reflection/WeekCard";
import ToolsUsed from "./ToolsUsed";
import ConsentPanel, { type ConsentView } from "./ConsentPanel";
import AxesTrend from "./AxesTrend";

interface Props {
  name: string; email: string; lang: string; accounts: boolean; memberSince: string;
  stats: { days: number; memories: number; messages: number; sessions: number };
  seem: { sentence: string; states: string[]; why: string | null; need: string | null };
  screenings: { name: string; domain: string; date: string; score: number; max: number; band: string }[];
  patterns: { domain: string; strength: number; note: string }[];
  rhythm: string[];
  reflection: WeeklyReflection;
  tools: { kind: string; count: number }[];
  consent: ConsentView;
  axesWeekly: { label: string; values: (number | null)[] }[];
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="pcard">
      <h2 className="display">{title}</h2>
      {hint && <p className="muted pcard-hint">{hint}</p>}
      <div className="pcard-body">{children}</div>
    </section>
  );
}

export default function ProfileClient(p: Props) {
  const router = useRouter();
  const [lang, setLang] = useState(p.lang);
  const [name, setName] = useState(p.name);
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: Record<string, unknown>) {
    setBusy(true); setNote(null);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Couldn't save that.");
      setNote(t("saved", lang)); return true;
    } catch (err) { setNote((err as Error).message); return false; }
    finally { setBusy(false); }
  }
  async function saveLanguage(id: string) { setLang(id); await post("/api/settings", { language: id }); router.refresh(); }
  async function saveName(e: React.FormEvent) { e.preventDefault(); if (name.trim() && name.trim() !== p.name) { if (await post("/api/settings", { displayName: name.trim() })) router.refresh(); } }
  async function savePassword(e: React.FormEvent) { e.preventDefault(); if (pw.length >= 8 && await post("/api/auth/password", { password: pw })) setPw(""); }
  async function deleteAll() { if (!confirm(t("deleteConfirm", lang))) return; if (await post("/api/settings", { clearAll: true })) router.refresh(); }

  return (
    <div className="profile-grid">
      <div className="profile-head">
        <div className="avatar-big" aria-hidden>{(p.name.trim()[0] ?? "?").toUpperCase()}</div>
        <div>
          <h1 className="display">{p.name}</h1>
          <p className="muted">{p.email || "—"}</p>
          <p className="muted" style={{ fontSize: ".85rem" }}>{t("memberSince", lang)} {p.memberSince}</p>
        </div>
      </div>

      <div className="pstats">
        {[[p.stats.days, t("daysTalking", lang)], [p.stats.memories, t("memoriesKept", lang)], [p.stats.sessions, t("chats", lang)]].map(([n, l]) => (
          <div key={String(l)} className="pstat"><b>{n}</b><span>{l}</span></div>
        ))}
      </div>

      <Card title={t("wkTitle", lang)}>
        <WeekCard r={p.reflection} lang={lang} />
        <div className="plabel" style={{ marginTop: 22 }}>{t("skTitle", lang)}</div>
        <ToolsUsed tools={p.tools} lang={lang} />
        <div className="prow" style={{ marginTop: 18 }}>
          <a className="btn" href="/story">{t("storyLink", lang)} <PxArrow className="pxicon" /></a>
          <a className="btn" href="/story#memories">{t("knowsTitle", lang)} <PxArrow className="pxicon" /></a>
        </div>
      </Card>

      <Card title={t("trendTitle", lang)} hint={t("trendHint", lang)}>
        <AxesTrend series={p.axesWeekly} lang={lang} />
      </Card>

      <Card title={t("results", lang)} hint={t("notDiagnosis", lang)}>
        <div className="plabel">{t("howYouSeem", lang)}</div>
        <p className="pseem">{p.seem.sentence}</p>
        {p.seem.states.length > 0 && <div className="pchips">{p.seem.states.map((s) => <span key={s} className="clay-chip">{s}</span>)}</div>}
        {p.seem.why && <p className="muted" style={{ marginTop: 8 }}>{p.seem.why}</p>}

        <div className="plabel" style={{ marginTop: 22 }}>{t("screenings", lang)}</div>
        {p.screenings.length ? (
          <table className="sheet-table"><tbody>
            {p.screenings.map((s, i) => <tr key={i}><td>{s.name} <span className="muted">({s.domain})</span></td><td>{s.date}</td><td>{s.score} / {s.max}</td><td>{s.band}</td></tr>)}
          </tbody></table>
        ) : <p className="muted">{t("noScreenings", lang)}</p>}

        <div className="plabel" style={{ marginTop: 22 }}>{t("patterns", lang)}</div>
        {p.patterns.length ? (
          <ul className="sheet-list">{p.patterns.map((x) => <li key={x.domain}><b>{x.domain}</b> <span className="bar" aria-hidden><i style={{ width: `${x.strength * 100}%` }} /></span> <span className="muted">{x.note}</span></li>)}</ul>
        ) : <p className="muted">{t("noPatterns", lang)}</p>}

        {p.rhythm.length > 0 && <><div className="plabel" style={{ marginTop: 22 }}>{t("rhythm", lang)}</div><ul className="sheet-list">{p.rhythm.map((l) => <li key={l}>{l}</li>)}</ul></>}
        <div className="prow" style={{ marginTop: 18 }}>
          <a className="btn" href="/summary">{t("summary", lang)} <PxArrow className="pxicon" /></a>
        </div>
      </Card>

      <Card title={t("account", lang)}>
        <form onSubmit={saveName} className="pform">
          <label className="label" htmlFor="pname">{t("name", lang)}</label>
          <div className="prow">
            <input id="pname" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            <button className="btn" type="submit" disabled={busy || !name.trim() || name.trim() === p.name}><PxCheck className="pxicon" /> {t("save", lang)}</button>
          </div>
        </form>
        <div className="pform">
          <div className="label">{t("username", lang)}</div>
          <div className="field pstatic">{p.email || "—"}</div>
        </div>
        <form onSubmit={savePassword} className="pform">
          <label className="label" htmlFor="ppw">{t("password", lang)}</label>
          <div className="field pstatic" aria-hidden>••••••••••</div>
          {p.accounts ? (
            <>
              <label className="label" htmlFor="ppw" style={{ marginTop: 10 }}>{t("newPassword", lang)}</label>
              <div className="prow">
                <input id="ppw" className="field" type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} />
                <button type="button" className="btn" onClick={() => setShowPw((v) => !v)}>{showPw ? "Hide" : "Show"}</button>
                <button className="btn btn-primary" type="submit" disabled={busy || pw.length < 8}>{t("changePassword", lang)}</button>
              </div>
            </>
          ) : <p className="muted" style={{ marginTop: 8, fontSize: ".85rem" }}>No password on this server: the name you signed in with is the whole account.</p>}
        </form>
        <div className="pform">
          <label className="label" htmlFor="plang">{t("language", lang)}</label>
          <select id="plang" className="field" value={lang} onChange={(e) => saveLanguage(e.target.value)} disabled={busy}>
            {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.id === "auto" ? l.label : `${l.native} (${l.label})`}</option>)}
          </select>
          <p className="muted" style={{ marginTop: 6, fontSize: ".85rem" }}>{t("languageHint", lang)}</p>
        </div>
        {note && <p role="status" style={{ marginTop: 6, fontSize: ".9rem" }}>{note}</p>}
      </Card>

      <Card title={t("dataTitle", lang)}>
        <ConsentPanel initial={p.consent} lang={lang} />
        <div className="prow" style={{ flexWrap: "wrap", marginTop: 18 }}>
          <a className="btn" href="/api/export" download="mindease-export.json"><PxDownload className="pxicon" /> {t("exportJson", lang)}</a>
          <button className="btn pdanger" onClick={deleteAll} disabled={busy}><PxBin className="pxicon" /> {t("deleteAll", lang)}</button>
        </div>
      </Card>
    </div>
  );
}
