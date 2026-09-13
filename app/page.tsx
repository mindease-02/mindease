import "./home.css";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import Nav from "@/components/home/Nav";
import Hero from "@/components/home/Hero";
import { Cta, Demo, FeatureRows, Footer, Story } from "@/components/home/Sections";
import ThemeInit from "@/components/home/ThemeInit";
import Marquee from "@/components/home/Marquee";
import MobileCta from "@/components/home/MobileCta";
import { getStore } from "@/lib/store";
import { pageLanguage } from "@/lib/i18n/server";
import { t, tickerItems } from "@/lib/i18n";

export default async function Home() {
  const session = await currentSession();
  const chatHref = session ? "/mood" : "/login";
  const state = session ? await getStore().get(session.userId) : null;
  const lang = await pageLanguage(state?.language);
  return (
    <div className={`world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden />
      <a href="#main" className="skip">Skip to content</a>
      <Nav chatHref={chatHref} signedIn={!!session} name={session?.name} lang={lang} />
      <main id="main" tabIndex={-1}>
        <Hero chatHref={chatHref} lang={lang} />
        <Marquee items={tickerItems(lang)} />
        <Demo lang={lang} />
        <FeatureRows chatHref={chatHref} lang={lang} />
        <Story lang={lang} />
        <Cta chatHref={chatHref} lang={lang} />
      </main>
      <Footer lang={lang} />
      <MobileCta href={chatHref} label={t("startTalking", lang)} />
    </div>
  );
}
