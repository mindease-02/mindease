import "./home.css";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import Nav from "@/components/home/Nav";
import Hero from "@/components/home/Hero";
import { Cta, Demo, FeatureRows, Footer, Story } from "@/components/home/Sections";
import ThemeInit from "@/components/home/ThemeInit";
import ScrollProgress from "@/components/home/ScrollProgress";
import Preloader from "@/components/home/Preloader";
import ScrollTitle from "@/components/home/ScrollTitle";
import Marquee from "@/components/home/Marquee";
import { TICKER } from "@/lib/ticker";

export default async function Home() {
  const session = await currentSession();
  const chatHref = session ? "/mood" : "/login";
  return (
    <div className={`world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden /><div className="bars" aria-hidden><span /><span /></div>
      <Preloader />
      <ScrollTitle />
      <ScrollProgress />
      <a href="#main" className="skip">Skip to content</a>
      <Nav chatHref={chatHref} signedIn={!!session} name={session?.name} />
      <main id="main" tabIndex={-1}>
        <Hero chatHref={chatHref} />
        <Marquee items={TICKER} />
        <Demo />
        <FeatureRows chatHref={chatHref} />
        <Story />
        <Cta chatHref={chatHref} />
      </main>
      <Footer />
    </div>
  );
}
