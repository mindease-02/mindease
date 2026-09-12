"use client";
import type { ChatSession } from "@/lib/store/types";
import { t } from "@/lib/i18n";
import { PxRemove, PxBin, PxMessage } from "../home/pixelIcons";

interface Props {
  open: boolean;
  lang: string;
  sessions: ChatSession[];
  currentId: string | null;
  onClose: () => void;
  onNew: () => void;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
}

function when(at: number, lang: string): string {
  const d = new Date(at), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const loc = lang === "ta" ? "ta-IN" : lang === "hi" ? "hi-IN" : "en-IN";
  if (sameDay) return d.toLocaleTimeString(loc, { hour: "numeric", minute: "2-digit" });
  const days = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (days < 7) return d.toLocaleDateString(loc, { weekday: "short" });
  return d.toLocaleDateString(loc, { day: "numeric", month: "short" });
}

/** Recent chats. Slides in from the left; the current one is marked. */
export default function ChatDrawer({ open, lang, sessions, currentId, onClose, onNew, onPick, onDelete }: Props) {
  return (
    <>
      <div className={`drawer-scrim ${open ? "on" : ""}`} onClick={onClose} aria-hidden />
      <aside className={`drawer ${open ? "on" : ""}`} aria-label={t("chats", lang)} aria-hidden={!open}>
        <header className="drawer-head">
          <h2 className="display">{t("chats", lang)}</h2>
          <button className="clay-btn px-3 py-2" onClick={onClose} aria-label="Close"><PxRemove className="pxicon" style={{ fontSize: 18 }} /></button>
        </header>
        <button className="clay-btn-primary drawer-new" onClick={onNew}><PxMessage className="pxicon" /> {t("newChat", lang)}</button>
        <div className="drawer-label">{t("recent", lang)}</div>
        <div className="thin-scroll drawer-list">
          {sessions.length === 0 && <p className="text-clay-muted" style={{ fontSize: ".85rem", padding: "6px 4px" }}>{t("noChats", lang)}</p>}
          {sessions.map((s) => (
            <div key={s.id} className={`drawer-item ${s.id === currentId ? "on" : ""}`}>
              <button className="drawer-pick" onClick={() => onPick(s.id)} aria-current={s.id === currentId ? "true" : undefined}>
                <b>{s.title || t("untitled", lang)}</b>
                <span>{when(s.lastAt, lang)} · {s.count}</span>
              </button>
              <button className="drawer-del" onClick={() => onDelete(s.id)} aria-label={t("deleteChat", lang)} title={t("deleteChat", lang)}><PxBin className="pxicon" /></button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
