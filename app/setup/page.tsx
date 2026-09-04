import "../home.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import Reveal from "@/components/home/Reveal";
import SetupForm from "@/components/SetupForm";
import { getStore, migrate } from "@/lib/store";

export default async function SetupPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const raw = await getStore().get(session.userId);
  const state = raw ? migrate(raw) : null;
  return (
    <div className={`world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden /><div className="bars" aria-hidden><span /><span /></div>
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
        <Link href="/chat" className="btn" style={{ padding: "10px 18px" }}>Skip</Link>
      </div></header>
      <Reveal as="main" className="entry shot"><div className="rays" aria-hidden /><SetupForm name={session.name} tz={state?.timeZone ?? "Asia/Kolkata"} /></Reveal>
    </div>
  );
}
