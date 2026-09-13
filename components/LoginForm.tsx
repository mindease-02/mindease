"use client";
import { useState } from "react";
import { regionFor } from "@/lib/util/region";
import { languageFromLocale, t, uiLang } from "@/lib/i18n";
import { PxArrow } from "./home/pixelIcons";
import { useRouter } from "next/navigation";

const ACCOUNTS = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function LoginForm({ lang = "en" }: { lang?: string }) {
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
    // The page's language wins when the person chose one; otherwise the browser's is a fair guess.
    const language = uiLang(lang) !== "en" || document.cookie.includes("me.lang=") ? uiLang(lang) : languageFromLocale(navigator.language);
    try {
      if (!ACCOUNTS) {
        const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, timeZone, region, language }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? t("cantSignIn", lang));
        router.push("/mood"); return;
      }
      if (mode === "forgot") {
        const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        if (!r.ok) throw new Error((await r.json()).error ?? t("cantSend", lang));
        setNotice(t("resetSent", lang)); setBusy(false); return;
      }
      const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name, timeZone, region, language }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? t("cantSignIn", lang));
      if (j.needsConfirmation) { setNotice(t("confirmSent", lang)); setMode("signin"); setBusy(false); return; }
      router.push("/mood");
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  const title = !ACCOUNTS ? t("whatCallYou", lang) : mode === "signup" ? t("makeAccount", lang) : mode === "forgot" ? t("forgotTitle", lang) : t("welcomeBack", lang);

  return (
    <form onSubmit={submit} className="glass w-full" style={{ maxWidth: 520, padding: 32 }} aria-labelledby="login-title">
      <div className="steps-ind" aria-label={t("step1", lang)}><i className="on" /><i /><span>{t("step1", lang)} · {mode === "signup" ? t("createAccount", lang) : t("signInWord", lang)}</span></div>
      <h1 id="login-title" className="display" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", margin: "12px 0 18px" }}>{title}</h1>

      {!ACCOUNTS ? (
        <>
          <label htmlFor="who" className="label">{t("whoLabel", lang)}</label>
          <input id="who" className="field" placeholder={t("whoPh", lang)} autoFocus autoComplete="username"
            value={identifier} onChange={(e) => setIdentifier(e.target.value)} maxLength={120} aria-describedby="who-help" />
          <p id="who-help" className="muted" style={{ fontSize: ".8rem", marginTop: 8, fontWeight: 300 }}>{t("whoHelp", lang)}</p>
        </>
      ) : (
        <>
          {mode === "signup" && (
            <>
              <label htmlFor="name" className="label">{t("whatCallYou", lang)}</label>
              <input id="name" className="field" placeholder={t("namePh", lang)} autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </>
          )}
          <label htmlFor="email" className="label" style={{ marginTop: mode === "signup" ? 14 : 0 }}>{t("email", lang)}</label>
          <input id="email" type="email" inputMode="email" className="field" placeholder={t("emailPh", lang)} autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode !== "forgot" && (
            <>
              <label htmlFor="password" className="label" style={{ marginTop: 14 }}>{t("passwordLabel", lang)}{mode === "signup" ? t("pw8", lang) : ""}</label>
              <div style={{ position: "relative" }}>
                <input id="password" type={showPw ? "text" : "password"} className="field" style={{ paddingRight: 88 }} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                <button type="button" className="btn" style={{ position: "absolute", right: 6, top: 7, minHeight: 44, padding: "0 12px", fontSize: ".8rem" }} onClick={() => setShowPw((v) => !v)}>{showPw ? t("hide", lang) : t("show", lang)}</button>
              </div>
            </>
          )}
        </>
      )}

      {(mode === "signup" || !ACCOUNTS) && (
        <label className="check" style={{ marginTop: 22 }}>
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} required />
          <span><b>{t("adultB", lang)}</b><span>{t("adultS", lang)}</span></span>
        </label>
      )}

      {error && <p role="alert" style={{ color: "var(--coral-2)", fontSize: ".9rem", marginTop: 14 }}>{error}</p>}
      {notice && <p role="status" style={{ color: "var(--ink)", fontSize: ".9rem", marginTop: 14 }}>{notice}</p>}
      <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 22 }} aria-busy={busy}
        disabled={busy || (!ACCOUNTS ? !identifier.trim() || !adult : mode === "forgot" ? !email : !email || password.length < 8 || (mode === "signup" && (!adult || !name.trim())))}>
        {busy ? t("oneMoment", lang) : mode === "forgot" ? t("sendReset", lang) : mode === "signup" ? t("createAccountBtn", lang) : t("continueBtn", lang)} <PxArrow className="pxicon" />
      </button>

      {ACCOUNTS && (
        <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 16, fontSize: ".85rem", flexWrap: "wrap" }}>
          {mode === "signin" ? <button type="button" className="linkish" onClick={() => setMode("signup")}>{t("newHere", lang)}</button> : <button type="button" className="linkish" onClick={() => setMode("signin")}>{t("haveAccount", lang)}</button>}
          {mode !== "forgot" ? <button type="button" className="linkish" onClick={() => setMode("forgot")}>{t("forgotPw", lang)}</button> : <span />}
        </div>
      )}
    </form>
  );
}
