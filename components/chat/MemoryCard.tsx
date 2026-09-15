"use client";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { tx } from "@/lib/i18n/tx";
import { kindOf } from "./memoryKinds";
import { PxCheck } from "../home/pixelIcons";

export interface MemoryLite { id: string; text: string; kind: string; importance?: number; era?: string }

/** The fade-and-shrink exit, matched to the CSS animation. Reduced motion skips the wait. */
const EXIT_MS = 300;
const exitMs = () => (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : EXIT_MS);

/**
 * One memory, where the person can see it, change it, or remove it.
 *  - mode "kept": a stored memory, shown with a small check. Tap the text to edit; "forget" deletes at once.
 *  - mode "proposed": MindEase wants to remember this. Nothing is stored until "Keep"; "Forget" drops it unstored.
 *  - mode "brought": a memory this reply drew on, one whisper-light line.
 */
export default function MemoryCard({ m, lang, mode = "kept", onChanged }: { m: MemoryLite; lang: string; mode?: "kept" | "proposed" | "brought"; onChanged?: (next: MemoryLite | null) => void }) {
  const [text, setText] = useState(m.text);
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "leaving" | "gone" | "kept">("idle");
  const [after, setAfter] = useState<"gone" | "kept">("gone");
  // Once a proposal is kept, the stored memory (with its real id) is what edit and forget act on.
  const [stored, setStored] = useState<MemoryLite | null>(null);
  const cur = stored ?? m;
  const k = kindOf(m.kind);

  // The exit plays, then the card settles into what comes next (nothing, or the kept line).
  useEffect(() => {
    if (state !== "leaving") return;
    const id = window.setTimeout(() => setState(after), exitMs());
    return () => window.clearTimeout(id);
  }, [state, after]);
  function leave(to: "gone" | "kept") { setAfter(to); setState("leaving"); }

  async function call(body: Record<string, unknown>) {
    setState("busy");
    const r = await fetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    return r?.ok ? j : null;
  }
  async function forget() { if (await call({ action: "forget", id: cur.id })) { leave("gone"); onChanged?.(null); } else setState("idle"); }
  async function save() {
    if (text.trim() === cur.text) { setEditing(false); return; }
    const j = await call({ action: "edit", id: cur.id, text });
    if (j) { setEditing(false); setState("idle"); setStored({ ...cur, text: j.memory.text }); onChanged?.({ ...cur, text: j.memory.text }); } else setState("idle");
  }
  async function keep() {
    const j = await call({ action: "keep", kind: m.kind, text, importance: m.importance, era: m.era });
    if (j) { setEditing(false); setStored(j.memory); leave("kept"); onChanged?.(j.memory); } else setState("idle");
  }
  function skip() { leave("gone"); onChanged?.(null); }

  if (state === "gone") return null;
  const style = { ["--kind" as string]: k.color };
  const leaving = state === "leaving" ? " leaving" : "";
  const busy = state === "busy" || state === "leaving";

  if (mode === "brought") {
    return (
      <div className="memline" style={style}>
        <k.Icon className="pxicon" aria-hidden />
        <span className="sr-only">{t("broughtUp", lang)} </span>
        <span className="memline-text">{m.text}</span>
      </div>
    );
  }

  const editor = <textarea className="memcard-edit" value={text} rows={2} maxLength={240} onChange={(e) => setText(e.target.value)} aria-label={t("memEdit", lang)} autoFocus />;

  // A proposal stays a card through its exit; once kept, it rests as a kept line below.
  if (mode === "proposed" && state !== "kept") {
    return (
      <div className={`memcard proposed${leaving}`} style={style} role="group" aria-label={t("memAsk", lang)}>
        <span className="memcard-kind"><k.Icon className="pxicon" aria-hidden /> {t("memAsk", lang)}</span>
        {editing ? editor : <button type="button" className="memcard-text" onClick={() => setEditing(true)} title={t("memEdit", lang)}>{text}</button>}
        <span className="memcard-actions">
          <button type="button" className="memcard-btn keep" disabled={busy || text.trim().length < 3} onClick={keep}>{t("memKeep", lang)}</button>
          <button type="button" className="memcard-btn quiet" disabled={busy} onClick={skip}>{tx("memForget", lang, "Forget")}</button>
        </span>
      </div>
    );
  }

  return (
    <div className={`memcard kept${leaving}${mode === "proposed" ? " fresh" : ""}`} style={style} role="group" aria-label={t(k.key, lang)}>
      <PxCheck className="pxicon memcard-check" aria-hidden />
      {editing ? editor : <button type="button" className="memcard-text" onClick={() => setEditing(true)} title={t("memEdit", lang)}>{text}</button>}
      <span className="memcard-actions">
        {editing && <button type="button" className="memcard-btn keep small" disabled={busy} onClick={save}>{t("save", lang)}</button>}
        <button type="button" className="memcard-btn quiet small" disabled={busy} onClick={forget}>{t("forget", lang)}</button>
      </span>
    </div>
  );
}
