"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Set a new password after the email link (the callback already exchanged the code for a session). */
export default function ResetForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { setError("The two passwords don't match."); return; }
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Couldn't set that password.");
      router.push("/mood");
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="glass w-full" style={{ maxWidth: 480, padding: 32 }}>
      <h1 className="display" style={{ fontSize: "clamp(2rem, 4vw, 2.6rem)", margin: "0 0 18px" }}>Choose a new password</h1>
      <label htmlFor="pw" className="label">New password (8+ characters)</label>
      <input id="pw" type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} required />
      <label htmlFor="pw2" className="label" style={{ marginTop: 14 }}>Again, to be sure</label>
      <input id="pw2" type="password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" minLength={8} required />
      {error && <p role="alert" style={{ color: "var(--coral-2)", fontSize: ".9rem", marginTop: 14 }}>{error}</p>}
      <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 22 }} disabled={busy || pw.length < 8} aria-busy={busy}>{busy ? "Saving…" : "Save and continue"} <span className="arrow" aria-hidden>→</span></button>
    </form>
  );
}
