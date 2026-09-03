import Link from "next/link";
import Orb from "@/components/Orb";
import { Cta, Features, Hero, HowItDecides, Safety } from "@/components/landing/Sections";
import { currentSession } from "@/lib/auth";

export default async function Home() {
  const session = await currentSession();
  const chatHref = session ? "/chat" : "/login";
  return (
    <main className="relative">
      <header className="sticky top-0 z-20 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Orb size={34} />
            <span className="font-serif text-xl tracking-tight">MindEase</span>
          </Link>
          <nav className="flex items-center gap-2">
            <a href="#how" className="clay-btn hidden sm:inline-flex">How it decides</a>
            <Link href={chatHref} className="clay-btn-primary">{session ? `Chat as ${session.name}` : "Chat"}</Link>
          </nav>
        </div>
      </header>
      <Hero chatHref={chatHref} />
      <HowItDecides />
      <Features />
      <Safety />
      <Cta chatHref={chatHref} />
      <footer className="px-6 pb-10 text-center text-xs text-clay-muted">
        MindEase &middot; Ori is software, and says so. &middot; <Link href={chatHref} className="underline">Open the chat</Link>
      </footer>
    </main>
  );
}
