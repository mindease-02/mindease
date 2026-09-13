import "../home.css";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import PageEnter from "@/components/home/PageEnter";
import MoodPicker from "@/components/MoodPicker";
import Reveal from "@/components/home/Reveal";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { pageLanguage } from "@/lib/i18n/server";
import LanguageSwitch from "@/components/LanguageSwitch";

export default async function MoodPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const lang = await pageLanguage((await getStore().get(session.userId))?.language);
  return (
    <div className={`world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <PageEnter />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden /><div className="bars" aria-hidden><span /><span /></div>
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><LanguageSwitch lang={lang} signedIn compact /><Link href="/chat" className="btn" style={{ padding: "10px 18px" }}>{t("skipToChat", lang)}</Link></div>
      </div></header>
      <Reveal as="main" className="entry shot"><div className="rays" aria-hidden /><MoodPicker name={session.name} lang={lang} /></Reveal>
    </div>
  );
}
