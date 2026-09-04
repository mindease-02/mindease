"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [proactive, setProactive] = useState(true);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const region = (navigator.language.split("-")[1] ?? "").toUpperCase() || undefined;
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, timeZone, region, proactive }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "couldn't sign in");
      router.push("/mood");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass w-full" style={{ maxWidth: 520, padding: 32 }} aria-labelledby="login-title">
      <div className="steps-ind" aria-label="Step 1 of 3"><i className="on" /><i /><i /><span>Step 1 of 3 · sign in</span></div>
      <h1 id="login-title" className="display" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", margin: "12px 0 18px" }}>What should Ori call you?</h1>
      <label htmlFor="who" className="label">Your name, or anything you&apos;ll remember</label>
      <input id="who" className="field" placeholder="e.g. Priya, or a nickname" autoFocus autoComplete="username"
        value={identifier} onChange={(e) => setIdentifier(e.target.value)} maxLength={120} aria-describedby="who-help" />
      <p id="who-help" className="muted" style={{ fontSize: ".8rem", marginTop: 8, fontWeight: 300 }}>No password. Whatever you type here is your key — use the same thing next time to pick up where you left off.</p>

      <label className="check" style={{ marginTop: 22 }}>
        <input type="checkbox" checked={proactive} onChange={(e) => setProactive(e.target.checked)} />
        <span><b>Let Ori check in on me unprompted.</b><span>Mornings, isolated evenings, long silences, real downward trends. Never in quiet hours, at most twice a day, and it stops if you don&apos;t answer.</span></span>
      </label>
      <label className="check" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} required />
        <span><b>I&apos;m 18 or over, and I understand what this is.</b><span>Software, not a therapist or a crisis service. It keeps short memories and mood estimates you can read, export and delete.</span></span>
      </label>

      {error && <p role="alert" style={{ color: "var(--coral-2)", fontSize: ".9rem", marginTop: 14 }}>{error}</p>}
      <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 22 }} disabled={busy || !identifier.trim() || !adult} aria-busy={busy}>{busy ? "Opening…" : "Continue"} <span className="arrow" aria-hidden>→</span></button>
    </form>
  );
}
