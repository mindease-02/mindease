"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/lib/i18n";

export interface ConsentView { enabled?: boolean; morningOptIn?: boolean; storeTranscript: boolean; retentionDays: number; voiceSignals: boolean; typingSignals: boolean; faceSignals: boolean; memoryMode?: "ask" | "auto" | "off"; ageBand?: string | null }

/**
 * The switches for what MindEase may read and keep, each next to a plain
 * sentence about what that actually is. Every signal is off until the person
 * turns it on; nothing here is auto-enabled.
 */
export default function ConsentPanel({ initial, lang, onSaved, onChange }: { initial: ConsentView; lang: string; onSaved?: () => void; onChange?: (c: ConsentView) => void }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function save(patch: Partial<ConsentView>) {
    const next = { ...c, ...patch }; setC(next); onChange?.(next); setBusy(true); setNote(null);
    try {
      const { ageBand, ...consentPatch } = patch;
      const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(Object.keys(consentPatch).length ? { consent: consentPatch } : {}), ...(ageBand !== undefined ? { ageBand } : {}) }) });
      if (!r.ok) throw new Error();
      setNote(t("saved", lang)); onSaved?.(); router.refresh();
    } catch { setNote(t("cantSave", lang)); setC(c); }
    finally { setBusy(false); }
  }

  const Row = ({ k, label, hint }: { k: keyof ConsentView; label: string; hint: string }) => (
    <label className="consent-row">
      <span className="consent-text"><b>{label}</b><span>{hint}</span></span>
      <span className={`switch ${c[k] ? "on" : ""}`}><input type="checkbox" checked={!!c[k]} disabled={busy} onChange={(e) => save({ [k]: e.target.checked } as Partial<ConsentView>)} /><i /></span>
    </label>
  );

  return (
    <div className="consent">
      {c.enabled !== undefined && <Row k="enabled" label={t("ciTitle", lang)} hint={t("ciHint", lang)} />}
      {c.enabled && <Row k="morningOptIn" label={t("morningTitle", lang)} hint={t("morningHint", lang)} />}
      <Row k="storeTranscript" label={t("dataTranscript", lang)} hint={t("dataWords", lang, { days: String(c.retentionDays) })} />
      {c.storeTranscript && (
        <label className="consent-row consent-sel">
          <span className="consent-text"><b>{t("dataRetention", lang)}</b></span>
          <select className="field" value={c.retentionDays} disabled={busy} onChange={(e) => save({ retentionDays: Number(e.target.value) })}>
            {[7, 30, 90].map((d) => <option key={d} value={d}>{t(`days${d}`, lang)}</option>)}
          </select>
        </label>
      )}
      <p className="consent-static">{t("dataMood", lang)}</p>
      <div className="consent-row consent-choice" role="radiogroup" aria-label={t("memModeTitle", lang)}>
        <span className="consent-text"><b>{t("memModeTitle", lang)}</b><span>{t("dataMemory", lang)}</span></span>
        <span className="seg">
          {(["ask", "auto", "off"] as const).map((mode) => (
            <button key={mode} type="button" role="radio" aria-checked={(c.memoryMode ?? "ask") === mode} disabled={busy} onClick={() => save({ memoryMode: mode })}>{t(`memMode_${mode}`, lang)}</button>
          ))}
        </span>
      </div>
      <Row k="typingSignals" label={t("typingLabel", lang)} hint={t("dataTyping", lang)} />
      <Row k="voiceSignals" label={t("voiceLabel", lang)} hint={t("dataVoice", lang)} />
      <Row k="faceSignals" label={t("faceLabel", lang)} hint={t("dataFace", lang)} />
      <p className="consent-static">{t("dataLearn", lang)}</p>
      <p className="consent-static">{t("dataLocation", lang)}</p>
      <label className="consent-row consent-sel">
        <span className="consent-text"><b>{t("ageTitle", lang)}</b><span>{t("ageWhy", lang)}</span></span>
        <select className="field" value={c.ageBand ?? ""} disabled={busy} onChange={(e) => save({ ageBand: e.target.value || null })}>
          <option value="">{t("agePrefer", lang)}</option>
          {process.env.NEXT_PUBLIC_ALLOW_TEENS === "1" && <option value="13-17">13-17</option>}
          <option value="18-24">18-24</option>
          <option value="25+">25+</option>
        </select>
      </label>
      <p className="consent-static">{t("dataWhere", lang)}</p>
      {note && <p role="status" className="muted" style={{ fontSize: ".85rem" }}>{note}</p>}
    </div>
  );
}
