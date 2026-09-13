"use client";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { kindOf } from "./memoryKinds";

export interface MemoryLite { id: string; text: string; kind: string; importance?: number; era?: string }

/**
 * One memory, where the person can see it, change it, or remove it.
 *  - mode "kept": a stored memory. Tap the text to edit; "forget" deletes at once, no confirmation.
 *  - mode "proposed": MindEase wants to remember this. Nothing is stored until "keep".
 *  - mode "brought": a memory this reply drew on, shown compactly.
 */
export default function MemoryCard({ m, lang, mode = "kept", onChanged }: { m: MemoryLite; lang: string; mode?: "kept" | "proposed" | "brought"; onChanged?: (next: MemoryLite | null) => void }) {
  const [text, setText] = useState(m.text);
  const [editing, setEditing] = useState(mode === "proposed" ? false : false);
  const [state, setState] = useState<"idle" | "busy" | "gone" | "kept" | "skipped">("idle");
  const k = kindOf(m.kind);

  async function call(body: Record<string, unknown>) {
    setState("busy");
    const r = await fetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    return r?.ok ? j : null;
  }
  async function forget() { if (await call({ action: "forget", id: m.id })) { setState("gone"); onChanged?.(null); } else setState("idle"); }
  async function save() {
    if (text.trim() === m.text) { setEditing(false); return; }
    const j = await call({ action: "edit", id: m.id, text });
    if (j) { setEditing(false); setState("idle"); onChanged?.({ ...m, text: j.memory.text }); } else setState("idle");
  }
  async function keep() {
    const j = await call({ action: "keep", kind: m.kind, text, importance: m.importance, era: m.era });
    if (j) { setState("kept"); onChanged?.(j.memory); } else setState("idle");
  }

  if (state === "gone" || state === "skipped") return null;
  const style = { ["--kind" as string]: k.color };

  if (mode === "brought") {
    return (
      <div className="memline" style={style}>
        <k.Icon className="pxicon" aria-hidden />
        <span>{t("broughtUp", lang)} {m.text}</span>
      </div>
    );
  }

  return (
    <div className={`memcard ${mode}`} style={style} role="group" aria-label={t(k.key, lang)}>
      <span className="memcard-kind"><k.Icon className="pxicon" aria-hidden /> {mode === "proposed" && state !== "kept" ? t("memAsk", lang) : t(k.key, lang)}</span>
      {editing || (mode === "proposed" && state !== "kept") ? (
        <textarea className="memcard-edit" value={text} rows={2} maxLength={240} onChange={(e) => setText(e.target.value)} aria-label={t("memEdit", lang)} />
      ) : (
        <button type="button" className="memcard-text" onClick={() => mode === "kept" && setEditing(true)} title={t("memEdit", lang)}>{text}</button>
      )}
      <span className="memcard-actions">
        {mode === "proposed" && state !== "kept" && <>
          <button type="button" className="memcard-btn keep" disabled={state === "busy" || text.trim().length < 3} onClick={keep}>{t("memKeep", lang)}</button>
          <button type="button" className="memcard-btn" disabled={state === "busy"} onClick={() => { setState("skipped"); onChanged?.(null); }}>{t("memSkip", lang)}</button>
        </>}
        {mode === "proposed" && state === "kept" && <span className="memcard-note">{t("memKept", lang)}</span>}
        {mode === "kept" && editing && <button type="button" className="memcard-btn keep" disabled={state === "busy"} onClick={save}>{t("save", lang)}</button>}
        {mode === "kept" && <button type="button" className="memcard-btn" disabled={state === "busy"} onClick={forget}>{t("forget", lang)}</button>}
      </span>
    </div>
  );
}
