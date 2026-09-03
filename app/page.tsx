import "./home.css";
import { currentSession } from "@/lib/auth";
import { body, display } from "@/components/home/fonts";
import Nav from "@/components/home/Nav";
import Hero from "@/components/home/Hero";
import { Cta, Features, Footer, Stats, Story } from "@/components/home/Sections";
import ThemeInit from "@/components/home/ThemeInit";

export default async function Home() {
  const session = await currentSession();
  const chatHref = session ? "/mood" : "/login";
  return (
    <div className={`world ${display.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden /><div className="bars" aria-hidden><span /><span /></div>
      <Nav chatHref={chatHref} signedIn={!!session} />
      <main>
        <Hero chatHref={chatHref} />
        <Features />
        <Story />
        <Stats />
        <Cta chatHref={chatHref} />
      </main>
      <Footer />
    </div>
  );
}
