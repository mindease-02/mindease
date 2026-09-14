import "../home.css";
import Link from "next/link";
import { headers } from "next/headers";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import CrisisCard from "@/components/chat/CrisisCard";
import LanguageSwitch from "@/components/LanguageSwitch";
import { helplinesFor, emergencyFor, HELPLINES } from "@/lib/safety/resources";
import { pageLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n";

export const metadata = { title: "Help now | MindEase" };

/**
 * Crisis help with no sign-in, no account, and nothing stored. The country
 * comes from the request (Vercel's IP country header) only to pick which
 * helplines to show; it is not recorded.
 */
export default async function HelpPage() {
  const lang = await pageLanguage();
  const h = await headers();
  const country = (h.get("x-vercel-ip-country") ?? "IN").toUpperCase();
  const known = HELPLINES.some((x) => x.region === country);
  const region = known ? country : "IN";
  return (
    <div className={`world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden />
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
        <LanguageSwitch lang={lang} compact />
      </div></header>
      <main className="container help-page" id="main">
        <h1 className="display">{t("helpTitle", lang)}</h1>
        <p className="muted help-sub">{known || country === "IN" ? t("helpSub", lang) : t("helpOutside", lang)}</p>
        <CrisisCard helplines={helplinesFor(region, lang)} emergency={emergencyFor(region)} lang={lang} mode="show" headingLevel={2} />
        <p className="muted help-foot">{t("helpVerified", lang)} <Link href="/how-it-works#crisis">{t("noteWhy", lang)}</Link></p>
      </main>
    </div>
  );
}
