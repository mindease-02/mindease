"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LANGUAGES, t } from "@/lib/i18n";
import { PxUser, PxMirror, PxSound, PxDownload, PxRefresh } from "../home/pixelIcons";

interface Props {
  name: string;
  email: string;
  lang: string;
  speak: boolean;
  onSpeak: (v: boolean) => void;
  onLanguage: (id: string) => void;
  onMirror: () => void;
  onLogout: () => void;
}

/** The person's corner of the header: who they are, where their results live, the switches that are theirs. */
export default function ProfileMenu({ name, email, lang, speak, onSpeak, onLanguage, onMirror, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", away); window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
  }, [open]);
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <div className="pmenu-root" ref={root}>
      <button className="avatar-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label={t("profile", lang)} title={t("profile", lang)}>
        <span>{initial}</span>
      </button>
      {open && (
        <div className="pmenu clay-dark" role="menu">
          <div className="pmenu-id">
            <b>{name}</b>
            <span>{email || "—"}</span>
          </div>
          <Link href="/mood" className="pmenu-item pmenu-mood" role="menuitem" onClick={() => setOpen(false)}><PxRefresh className="pxicon" /> {t("changeMood", lang)}</Link>
          <Link href="/profile" className="pmenu-item" role="menuitem" onClick={() => setOpen(false)}><PxUser className="pxicon" /> {t("profileResults", lang)}</Link>
          <Link href="/summary" className="pmenu-item" role="menuitem" onClick={() => setOpen(false)}><PxDownload className="pxicon" /> {t("summary", lang)}</Link>
          <button className="pmenu-item" role="menuitem" onClick={() => { setOpen(false); onMirror(); }}><PxMirror className="pxicon" /> {t("mirror", lang)}</button>
          <button className="pmenu-item" role="menuitemcheckbox" aria-checked={speak} onClick={() => onSpeak(!speak)}><PxSound className="pxicon" /> {speak ? t("voiceOn", lang) : t("voiceOff", lang)}</button>
          <label className="pmenu-lang">
            <span>{t("language", lang)}</span>
            <select value={lang} onChange={(e) => { document.cookie = `me.lang=${e.target.value}; path=/; max-age=31536000; samesite=lax`; onLanguage(e.target.value); }}>
              {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.id === "auto" ? l.label : `${l.native} (${l.label})`}</option>)}
            </select>
          </label>
          <button className="pmenu-item pmenu-out" role="menuitem" onClick={onLogout}>{t("signOut", lang)}</button>
        </div>
      )}
    </div>
  );
}
