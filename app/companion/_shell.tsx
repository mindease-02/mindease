import "../home.css";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";

/** The page frame every companion route shares: fonts, theme, atmosphere layers. */
export default function CompanionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`world companion-world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden />
      {children}
    </div>
  );
}
