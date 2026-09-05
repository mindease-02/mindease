"use client";
import { useState } from "react";
import { regionFor } from "@/lib/util/region";
import { PxArrow } from "./home/pixelIcons";
import { useRouter } from "next/navigation";

const ACCOUNTS = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const region = regionFor(timeZone, navigator.language);
    try {
      if (!ACCOUNTS) {
        const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, timeZone, region }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Couldn't sign in.");
        router.push("/mood"); return;
      }
      if (mode === "forgot") {
        const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        if (!r.ok) throw new Error((await r.json()).error ?? "Couldn't send that.");
        setNotice("If that address has an account, a reset link is on its way. Check spam too."); setBusy(false); return;
      }
      const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name, timeZone, region }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Couldn't sign in.");
      if (j.needsConfirmation) { setNotice("Almost there - open the confirmation email we just sent, then sign in."); setMode("signin"); setBusy(false); return; }
      router.push("/mood");
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  const title = !ACCOUNTS ? "What should Ori call you?" : mode === "signup" ? "Make an account" : mode === "forgot" ? "Forgot your password?" : "Welcome back";

  return (
    <form onSubmit={submit} className="glass w-full" style={{ maxWidth: 520, padding: 32 }} aria-labelledby="login-title">
      <div className="steps-ind" aria-label="Step 1 of 2"><i className="on" /><i /><span>Step 1 of 2 · {mode === "signup" ? "create account" : "sign in"}</span></div>
      <h1 id="login-title" className="display" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", margin: "12px 0 18px" }}>{title}</h1>

      {!ACCOUNTS ? (
        <>
          <label htmlFor="who" className="label">Your name, or anything you&apos;ll remember</label>
          <input id="who" className="field" placeholder="e.g. Priya, or a nickname" autoFocus autoComplete="username"
            value={identifier} onChange={(e) => setIdentifier(e.target.value)} maxLength={120} aria-describedby="who-help" />
          <p id="who-help" className="muted" style={{ fontSize: ".8rem", marginTop: 8, fontWeight: 300 }}>No password on this server. Whatever you type here is your key — use the same thing next time.</p>
        </>
      ) : (
        <>
          {mode === "signup" && (
            <>
              <label htmlFor="name" className="label">What should Ori call you?</label>
              <input id="name" className="field" placeholder="e.g. Priya" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
            </>
          )}
          <label htmlFor="email" className="label" style={{ marginTop: mode === "signup" ? 14 : 0 }}>Email</label>
          <input id="email" type="email" inputMode="email" className="field" placeholder="you@example.com" autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode !== "forgot" && (
            <>
              <label htmlFor="password" className="label" style={{ marginTop: 14 }}>Password{mode === "signup" ? " (8+ characters)" : ""}</label>
              <div style={{ position: "relative" }}>
                <input id="password" type={showPw ? "text" : "password"} className="field" style={{ paddingRight: 88 }} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="btn" style={{ position: "absolute", right: 6, top: 7, minHeight: 44, padding: "0 12px", fontSize: ".8rem" }} onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}>{showPw ? "Hide" : "Show"}</button>
              </div>
            </>
          )}
        </>
      )}

      {(mode === "signup" || !ACCOUNTS) && (
        <>
          <label className="check" style={{ marginTop: 22 }}>
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} required />
            <span><b>I&apos;m 18 or over, and I understand what this is.</b><span>Software, not a therapist or a crisis service. It may write to you first when it notices something, never at night. It keeps short memories and mood estimates you can read, export and delete.</span></span>
          </label>
        </>
      )}

      {error && <p role="alert" style={{ color: "var(--coral-2)", fontSize: ".9rem", marginTop: 14 }}>{error}</p>}
      {notice && <p role="status" style={{ color: "var(--ink)", fontSize: ".9rem", marginTop: 14 }}>{notice}</p>}
      <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 22 }} aria-busy={busy}
        disabled={busy || (!ACCOUNTS ? !identifier.trim() || !adult : mode === "forgot" ? !email : !email || password.length < 8 || (mode === "signup" && (!adult || !name.trim())))}>
        {busy ? "One moment…" : mode === "forgot" ? "Send reset link" : mode === "signup" ? "Create account" : "Continue"} <PxArrow className="pxicon" />
      </button>

      {ACCOUNTS && (
        <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16, fontSize: ".85rem", flexWrap: "wrap" }}>
          {mode === "signin" ? <button type="button" className="linkish" onClick={() => setMode("signup")}>New here? Create an account</button> : <button type="button" className="linkish" onClick={() => setMode("signin")}>Have an account? Sign in</button>}
          {mode !== "forgot" ? <button type="button" className="linkish" onClick={() => setMode("forgot")}>Forgot password?</button> : <span />}
        </div>
      )}
    </form>
  );
}
