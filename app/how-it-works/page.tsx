import "../home.css";
import Link from "next/link";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import TrustStrip from "@/components/TrustStrip";
import LanguageSwitch from "@/components/LanguageSwitch";
import { pageLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n";

export const metadata = { title: "How it works | MindEase" };

const SECTIONS = [
  { id: "reliance", title: "hwRelT", paras: ["hwRel1", "hwRel2", "hwRel3"] },
  { id: "checkins", title: "hwChkT", paras: ["hwChk1", "hwChk2"] },
  { id: "read", title: "hwReadT", paras: ["hwRead1", "hwRead2", "hwRead3"] },
  { id: "memory", title: "hwMemT", paras: ["hwMem1", "hwMem2"] },
  { id: "crisis", title: "hwCriT", paras: ["hwCri1", "hwCri2", "hwCri3"] },
  { id: "language", title: "hwLangT", paras: ["hwLang1", "hwLang2"] },
  { id: "learning", title: "hwLearnT", paras: ["hwLearn1", "hwLearn2"] },
  { id: "limits", title: "hwLimT", paras: ["hwLim1", "hwLim2"] },
];

/** The design philosophy in plain words, public, so anyone can check the product against it. */
export default async function HowItWorks() {
  const lang = await pageLanguage();
  return (
    <div className={`world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden />
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><LanguageSwitch lang={lang} compact /><Link href="/help" className="btn" style={{ padding: "10px 18px" }}>{t("helpNow", lang)}</Link></div>
      </div></header>
      <TrustStrip lang={lang} />
      <main className="container hw" id="main">
        <h1 className="display">{t("hwTitle", lang)}</h1>
        <p className="hw-lede">{t("hwLede", lang)}</p>
        <nav className="hw-toc" aria-label={t("hwTitle", lang)}>
          {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{t(s.title, lang)}</a>)}
        </nav>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="hw-sec">
            <h2 className="display">{t(s.title, lang)}</h2>
            {s.paras.map((p) => <p key={p}>{t(p, lang)}</p>)}
          </section>
        ))}
      </main>
    </div>
  );
}
