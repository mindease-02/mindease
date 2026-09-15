"use client";
import { useEffect, useRef, useState } from "react";
import CrisisCard from "@/components/chat/CrisisCard";
import { emergencyFor, helplinesFor } from "@/lib/safety/resources";
import { t } from "@/lib/i18n";

/**
 * A floating "Need help now?" button on every screen of the landing page. It
 * opens the same crisis card the chat uses: verified Indian lines, click to
 * call, the nearest public hospital. The one-line trust strip in the header
 * stays as well; this is a second, thumb-reachable way in, not a replacement.
 */
export default function HelpFab({ lang }: { lang: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const modal = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    modal.current?.querySelector<HTMLElement>("a, button")?.focus();
    const opener = btn.current;
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; opener?.focus(); };
  }, [open]);
  return (
    <>
      <button ref={btn} type="button" className="help-fab" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={t("helpFab", lang)}>
        <span className="help-fab-ico" aria-hidden>🆘</span><span className="help-fab-txt">{t("helpFab", lang)}</span>
      </button>
      {open && (
        <div className="help-backdrop" onClick={() => setOpen(false)}>
          <div ref={modal} className="help-modal glass-card" role="dialog" aria-modal="true" aria-label={t("helpFab", lang)} onClick={(e) => e.stopPropagation()}>
            <CrisisCard helplines={helplinesFor("IN", lang)} emergency={emergencyFor("IN")} lang={lang} mode="open" onClose={() => setOpen(false)} headingLevel={2} />
            <p className="help-foot">{t("helpFoot", lang)}</p>
          </div>
        </div>
      )}
    </>
  );
}
