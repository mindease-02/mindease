import "../home.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import Reveal from "@/components/home/Reveal";
import ResetForm from "@/components/ResetForm";

export default async function ResetPage() {
  if (!(await currentSession())) redirect("/login?reset=expired");
  return (
    <div className={`world ${display.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden />
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
      </div></header>
      <Reveal as="main" className="entry shot"><div className="rays" aria-hidden /><div data-reveal style={{ width: "100%", display: "grid", placeItems: "center" }}><ResetForm /></div></Reveal>
    </div>
  );
}
