import "../home.css";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display } from "@/components/home/fonts";
import MoodPicker from "@/components/MoodPicker";
import Reveal from "@/components/home/Reveal";
import Link from "next/link";

export default async function MoodPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  return (
    <div className={`world ${display.variable} ${body.variable}`}>
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden /><div className="bars" aria-hidden><span /><span /></div>
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
        <Link href="/chat" className="btn" style={{ padding: "10px 18px" }}>Skip to chat</Link>
      </div></header>
      <Reveal as="main" className="entry"><MoodPicker name={session.name} /></Reveal>
    </div>
  );
}
