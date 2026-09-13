import "../home.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import PageEnter from "@/components/home/PageEnter";
import LoginForm from "@/components/LoginForm";
import Reveal from "@/components/home/Reveal";
import LanguageSwitch from "@/components/LanguageSwitch";
import { pageLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n";

export default async function LoginPage() {
  if (await currentSession()) redirect("/mood");
  const lang = await pageLanguage();
  return (
    <div className={`world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <PageEnter />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden /><div className="bars" aria-hidden><span /><span /></div>
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><LanguageSwitch lang={lang} compact /><Link href="/" className="btn" style={{ padding: "10px 18px" }}>← {t("back", lang)}</Link></div>
      </div></header>
      <Reveal as="main" className="entry shot"><div className="rays" aria-hidden /><div data-reveal style={{ width: "100%", display: "grid", placeItems: "center" }}><LoginForm lang={lang} /></div></Reveal>
    </div>
  );
}
