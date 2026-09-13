import "../home.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import { getStore, migrate } from "@/lib/store";
import { userView } from "@/lib/pipeline/userView";
import { INSTRUMENTS, bandFor } from "@/lib/screening/instruments";
import { patternReport } from "@/lib/screening";
import { lifestylePatterns } from "@/lib/lifestyle/patterns";
import { supabaseConfigured } from "@/lib/supabase";
import { t } from "@/lib/i18n";
import { pageLanguage } from "@/lib/i18n/server";
import TrustStrip from "@/components/TrustStrip";
import ProfileClient from "@/components/profile/ProfileClient";

/**
 * The person's page: who they are to MindEase (name, username, password),
 * the language it speaks to them in, and everything it has read about them,
 * in plain words. The printable clinician sheet lives at /summary.
 */
export default async function ProfilePage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const raw = await getStore().get(session.userId);
  if (!raw) redirect("/mood");
  const state = migrate(raw);
  const now = Date.now();
  const lang = await pageLanguage(state.language);
  const view = userView(state, now);
  const done = (state.screenings ?? []).filter((s) => s.completedAt).sort((a, b) => b.completedAt! - a.completedAt!);
  const life = lifestylePatterns(state.history, state.timeZone, now);
  const days = new Set(state.history.map((p) => new Date(p.at).toDateString())).size;
  const loc = lang === "ta" ? "ta-IN" : lang === "hi" ? "hi-IN" : "en-IN";
  const fmt = (x: number) => new Date(x).toLocaleDateString(loc, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={`world profile-world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden />
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
        <Link href="/chat" className="btn" style={{ padding: "10px 18px" }}>← {t("backToChat", lang)}</Link>
      </div></header>
      <TrustStrip lang={lang} />
      <main className="container profile" id="main">
        <ProfileClient
          name={state.displayName}
          email={session.identifier}
          lang={lang}
          accounts={supabaseConfigured()}
          memberSince={fmt(state.createdAt)}
          stats={{ days, memories: state.memories.length, messages: state.messages.length, sessions: (state.sessions ?? []).length }}
          seem={view.seem}
          screenings={done.map((s) => { const inst = INSTRUMENTS[s.instrument]; return { name: inst.name, domain: inst.domain, date: fmt(s.completedAt!), score: s.score!, max: inst.max, band: bandFor(inst, s.score!).label }; })}
          patterns={patternReport(state, now).map((p) => ({ domain: p.domain, strength: p.strength, note: p.evidence }))}
          rhythm={life.sufficient ? life.lines : []}
          reflection={view.reflection}
          tools={view.tools}
          consent={{ storeTranscript: state.consent.storeTranscript, retentionDays: state.consent.retentionDays, voiceSignals: state.consent.voiceSignals, typingSignals: state.consent.typingSignals, faceSignals: state.consent.faceSignals }}
        />
      </main>
    </div>
  );
}
