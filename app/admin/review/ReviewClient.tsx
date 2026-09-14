"use client";
import { useEffect, useState } from "react";

type Review = {
  generatedAt: string; people: number; note: string;
  checkinsByStyle: Record<string, { sent: number; notUsefulRate: number; meanOutcome: number | null }>;
  replyRatings: Record<string, number>; missedReasons: Record<string, number>; readCorrections: Record<string, number>;
  guardRewrites: Record<string, number>; memoryModes: Record<string, number>;
};

const KEY = "me-admin-secret";

export default function ReviewClient() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { try { const s = sessionStorage.getItem(KEY); if (s) { setSecret(s); void load(s); } } catch { /* no storage */ } }, []);

  async function load(s: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/review", { headers: { authorization: `Bearer ${s}` }, cache: "no-store" });
      if (!res.ok) { setData(null); setError(res.status === 403 ? "That secret was not accepted." : `The review could not be built (${res.status}).`); return; }
      setData((await res.json()) as Review);
      try { sessionStorage.setItem(KEY, s); } catch { /* fine */ }
    } catch { setError("The review could not be fetched."); }
    finally { setBusy(false); }
  }

  const rows = (o: Record<string, number>) => Object.entries(o);
  return (
    <main style={S.page}>
      <h1 style={S.h1}>MindEase review</h1>
      <p style={S.p}>Aggregate counts only. Read, decide, author a change, run <code>npm run gate</code>. Nothing here changes the product on its own.</p>
      <form style={S.form} onSubmit={(e) => { e.preventDefault(); void load(secret); }}>
        <label style={S.label} htmlFor="secret">Admin secret</label>
        <input id="secret" type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} style={S.input} />
        <button type="submit" disabled={busy || !secret} style={S.btn}>{busy ? "Loading" : "Load"}</button>
        <button type="button" onClick={() => { setSecret(""); setData(null); try { sessionStorage.removeItem(KEY); } catch { /* fine */ } }} style={S.btnGhost}>Forget</button>
      </form>
      {error && <p role="alert" style={{ ...S.p, color: "#f0876a" }}>{error}</p>}
      {data && (
        <div style={S.grid}>
          <section style={S.card}><h2 style={S.h2}>People</h2><p style={S.big}>{data.people}</p><p style={S.small}>Generated {new Date(data.generatedAt).toLocaleString()}</p></section>
          <section style={S.card}><h2 style={S.h2}>Reply ratings</h2><Table rows={rows(data.replyRatings)} head={["Verdict", "Count"]} /></section>
          <section style={S.card}><h2 style={S.h2}>Why a reply missed</h2><Table rows={rows(data.missedReasons)} head={["Reason", "Count"]} empty="No reasons yet." /></section>
          <section style={S.card}><h2 style={S.h2}>Read corrections</h2><Table rows={rows(data.readCorrections)} head={["Said → meant", "Count"]} empty="No corrections yet." /></section>
          <section style={S.card}><h2 style={S.h2}>Guard rewrites</h2><Table rows={rows(data.guardRewrites)} head={["Rule", "Count"]} empty="No rewrites yet." /></section>
          <section style={S.card}><h2 style={S.h2}>Memory modes</h2><Table rows={rows(data.memoryModes)} head={["Mode", "People"]} /></section>
          <section style={{ ...S.card, gridColumn: "1 / -1" }}>
            <h2 style={S.h2}>Check-ins by style</h2>
            <table style={S.table}><thead><tr><th style={S.th}>Style</th><th style={S.th}>Sent</th><th style={S.th}>Not useful</th><th style={S.th}>Mean outcome</th></tr></thead>
              <tbody>{Object.entries(data.checkinsByStyle).length ? Object.entries(data.checkinsByStyle).map(([k, v]) => (
                <tr key={k}><td style={S.td}>{k}</td><td style={S.td}>{v.sent}</td><td style={S.td}>{Math.round(v.notUsefulRate * 100)}%</td><td style={S.td}>{v.meanOutcome === null ? "—" : v.meanOutcome.toFixed(2)}</td></tr>
              )) : <tr><td style={S.td} colSpan={4}>No check-ins sent yet.</td></tr>}</tbody></table>
          </section>
        </div>
      )}
    </main>
  );
}

function Table({ rows, head, empty = "Nothing yet." }: { rows: [string, number][]; head: [string, string]; empty?: string }) {
  return (
    <table style={S.table}>
      <thead><tr><th style={S.th}>{head[0]}</th><th style={S.th}>{head[1]}</th></tr></thead>
      <tbody>{rows.length ? rows.map(([k, v]) => <tr key={k}><td style={S.td}>{k}</td><td style={S.td}>{v}</td></tr>) : <tr><td style={S.td} colSpan={2}>{empty}</td></tr>}</tbody>
    </table>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 980, margin: "0 auto", padding: "40px 20px 80px", color: "#ecebe7", background: "#07080b", minHeight: "100vh", fontFamily: "ui-sans-serif, system-ui, sans-serif" },
  h1: { fontSize: "1.6rem", margin: "0 0 8px", fontWeight: 600 },
  h2: { fontSize: "0.95rem", margin: "0 0 10px", fontWeight: 600, color: "#b9b9c2" },
  p: { color: "#b9b9c2", lineHeight: 1.5, margin: "0 0 18px" },
  small: { color: "#7e7f8a", fontSize: ".85rem", margin: 0 },
  big: { fontSize: "2.2rem", margin: "0 0 6px", fontWeight: 600 },
  form: { display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", margin: "0 0 24px" },
  label: { display: "block", fontSize: ".85rem", color: "#b9b9c2", width: "100%" },
  input: { padding: "10px 12px", borderRadius: 10, border: "1px solid #2a2b33", background: "#101117", color: "#ecebe7", minWidth: 260 },
  btn: { padding: "10px 16px", borderRadius: 10, border: 0, background: "#7fd0e0", color: "#07080b", fontWeight: 600, cursor: "pointer" },
  btnGhost: { padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2b33", background: "transparent", color: "#b9b9c2", cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 },
  card: { background: "#101117", border: "1px solid #1f2028", borderRadius: 14, padding: 18 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: ".9rem" },
  th: { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #2a2b33", color: "#7e7f8a", fontWeight: 500 },
  td: { padding: "6px 8px", borderBottom: "1px solid #1a1b22", verticalAlign: "top" },
};
