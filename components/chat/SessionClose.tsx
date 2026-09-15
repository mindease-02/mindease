"use client";
/**
 * One quiet card under the last reply when a chat seems to be ending: after a
 * long conversation, or when the person says thanks or bye. It offers a way to
 * leave well, never a reason to stay. Escape, or simply typing on, hides it.
 */
import { useEffect, useRef, useState } from "react";
import { popIn } from "@/lib/motion";
import { tx } from "@/lib/i18n/tx";

// Short sign-offs only. "thanks, that helped, but..." is a conversation, not a goodbye.
const BYE = /^(?:ok(?:ay)?[,\s]+)?(?:bye|good\s?bye|bye\s?bye|thanks?|thank\s?you|thankyou|thx|ty|good\s?night|gn|nite|see\s?(?:you|ya)|ttyl|cya|take\s?care|alvida|nandri|dhanyavaad|shukriya|நன்றி|பை|धन्यवाद|शुक्रिया|बाय)(?:[,\s]+(?:bye|thanks|thank\s?you|for\s?now|then|mindease|a\s?lot|so\s?much|again|later|for\s?today|for\s?this))*$/i;

/** True when a message is a plain goodbye or thanks. */
export function isGoodbye(text: string): boolean {
  const s = text.trim().toLowerCase().replace(/[!.?…,]+/g, " ").replace(/\s+/g, " ").trim();
  return s.length > 0 && s.length <= 40 && BYE.test(s);
}

interface Props {
  lang: string;
  busy: boolean;
  /** Check-ins are already paused (the pause button then just says so). */
  paused: boolean;
  onPause: () => void;
  onMirror: () => void;
  onEnd: (note: string) => void;
  onDismiss: () => void;
}

export default function SessionClose({ lang, busy, paused, onPause, onMirror, onEnd, onDismiss }: Props) {
  const [note, setNote] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { popIn(root.current); }, []);
  // Escape anywhere on the page hides it; this is not a dialog and never holds focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);
  const title = tx("closeTitle", lang, "Want to leave it here? I can note one line for next time.");
  const ph = tx("closeNotePh", lang, "one line for next time");
  return (
    <div ref={root} className="offer close-card" role="group" aria-label={title}>
      <p className="offer-q">{title}</p>
      <input className="clay-input close-note" type="text" value={note} maxLength={240} placeholder={ph} aria-label={ph} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnd(note.trim()); } }} />
      <div className="offer-opts">
        <button type="button" className="offer-opt" disabled={busy || paused} onClick={onPause}><b>{paused ? tx("closePaused", lang, "Check-ins paused") : tx("closePause", lang, "Pause check-ins 3 days")}</b></button>
        <button type="button" className="offer-opt" disabled={busy} onClick={onMirror}><b>{tx("closeSeeMirror", lang, "See Mirror")}</b></button>
        <button type="button" className="offer-opt dim" disabled={busy} onClick={() => onEnd(note.trim())}><b>{tx("closeEnd", lang, "End")}</b></button>
      </div>
    </div>
  );
}
