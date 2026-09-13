import "../home.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import PageEnter from "@/components/home/PageEnter";
import TrustStrip from "@/components/TrustStrip";
import WelcomeClient from "@/components/welcome/WelcomeClient";
import { getStore, migrate } from "@/lib/store";
import { loadOrCreate } from "@/lib/pipeline/turn";
import { pageLanguage } from "@/lib/i18n/server";

/** First visit only: three plain facts, one line to try the read, and the signal switches. Ninety seconds, skippable. */
export default async function WelcomePage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const state = migrate(await loadOrCreate(session.userId, session.name));
  if (state.setupDone) redirect("/mood");
  await getStore().put(state);
  const lang = await pageLanguage(state.language);
  return (
    <div className={`world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <PageEnter />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden />
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
      </div></header>
      <TrustStrip lang={lang} />
      <main className="entry welcome-entry" id="main">
        <WelcomeClient name={session.name} lang={lang} consent={{ storeTranscript: state.consent.storeTranscript, retentionDays: state.consent.retentionDays, voiceSignals: state.consent.voiceSignals, typingSignals: state.consent.typingSignals, faceSignals: state.consent.faceSignals }} />
      </main>
    </div>
  );
}
