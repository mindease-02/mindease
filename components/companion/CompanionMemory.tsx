"use client";
/** "What your companion remembers." Content, date, delete - and forget everything. */
import { useEffect, useState } from "react";
import { PxBin, PxBrain } from "../home/pixelIcons";

interface Mem { id: string; memory: string; kind: string; createdAt: number }

export default function CompanionMemory({ name }: { name: string }) {
  const [items, setItems] = useState<Mem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try { const r = await fetch("/api/companion/memory", { cache: "no-store" }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setItems(j.memories); }
    catch (e) { setErr((e as Error).message); setItems([]); }
  }
  useEffect(() => { load(); }, []);

  async function forget(id: string) {
    setBusy(id);
    try { await fetch(`/api/companion/memory?id=${encodeURIComponent(id)}`, { method: "DELETE" }); setItems((m) => (m ?? []).filter((x) => x.id !== id)); }
    finally { setBusy(null); }
  }
  async function forgetAll() {
    if (!confirm(`Make ${name} forget everything? This can't be undone.`)) return;
    setBusy("all");
    try { await fetch("/api/companion/memory?all=1", { method: "DELETE" }); setItems([]); } finally { setBusy(null); }
  }

  return (
    <div className="cmp-page">
      <h1 className="display cmp-setup-title">What {name} remembers</h1>
      <p className="muted cmp-setup-sub">Short facts from what you&apos;ve said. Nothing is inferred behind your back, and a deleted line is gone from the next message on.</p>
      {err && <p className="cmp-err" role="alert">{err}</p>}
      {items === null && <div className="cmp-preview-wait"><i /><i /><i /></div>}
      {items && items.length === 0 && <div className="cmp-empty"><PxBrain className="pxicon" style={{ fontSize: 28 }} /><p>Nothing yet. {name} only keeps what a good friend would remember next week - a name, a plan, something you like.</p></div>}
      {items && items.length > 0 && (
        <ul className="cmp-memlist">
          {items.map((m) => (
            <li key={m.id}>
              <div><span className="cmp-mem-k">{m.kind}</span><span className="cmp-mem-d">{new Date(m.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span></div>
              <p>{m.memory}</p>
              <button type="button" className="btn" disabled={busy === m.id} onClick={() => forget(m.id)} aria-label={`Forget: ${m.memory}`}><PxBin className="pxicon" /> Delete</button>
            </li>
          ))}
        </ul>
      )}
      <div className="cmp-setup-nav">
        <a href="/companion" className="btn">Back</a>
        {items && items.length > 0 && <button type="button" className="btn cmp-danger" disabled={busy === "all"} onClick={forgetAll}>Forget everything</button>}
      </div>
    </div>
  );
}
