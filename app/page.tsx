import Link from "next/link";
import Orb from "@/components/Orb";
import { Cta, Features, Hero, HowItWorks, Safety } from "@/components/landing/Sections";

export default function Home() {
  return (
    <main className="relative">
      <header className="sticky top-0 z-20 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Orb size={34} />
            <span className="font-serif text-xl tracking-tight">MindEase</span>
          </Link>
          <nav className="flex items-center gap-2">
            <a href="#how" className="clay-btn hidden sm:inline-flex">How it works</a>
            <Link href="/login" className="clay-btn-dark">Sign in</Link>
          </nav>
        </div>
      </header>
      <Hero />
      <Features />
      <HowItWorks />
      <Safety />
      <Cta />
      <footer className="px-6 pb-10 text-center text-xs text-clay-muted">
        MindEase &middot; Ori is software, and says so. &middot; <Link href="/login" className="underline">Sign in</Link>
      </footer>
    </main>
  );
}
