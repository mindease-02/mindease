"use client";
import { NEARBY_HELP_URL, type Helpline } from "@/lib/safety/resources";
import { t } from "@/lib/i18n";

/** Rendered from hard-coded data only. The model never supplies a number. */
export default function CrisisCard({ helplines, emergency, lang = "en" }: { helplines: Helpline[]; emergency: string; lang?: string }) {
  return (
    <div className="clay-dark animate-rise mx-auto my-3 w-full max-w-lg p-5">
      <div className="text-[13px] text-clay-haze">{t("crisisEyebrow", lang)}</div>
      <p className="mt-2 text-sm leading-relaxed text-clay-surface">{t("crisisP", lang, { emergency })}</p>
      <ul className="mt-3 space-y-2">
        {helplines.map((h) => (
          <li key={h.name} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-2xl bg-white/5 px-4 py-2.5 text-sm">
            <span className="font-medium text-clay-surface">{h.name}</span>
            <span className="text-clay-peach">{h.url ? <a href={h.url} target="_blank" rel="noreferrer" className="underline decoration-clay-peach/40">{h.contact}</a> : h.contact}</span>
            {h.note && <span className="w-full text-xs text-clay-haze/80">{h.note}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-clay-surface">{t("crisisNotEmergency", lang)} <a href={NEARBY_HELP_URL} target="_blank" rel="noreferrer" className="underline decoration-clay-peach/40 text-clay-peach">{t("crisisFind", lang)}</a></p>
      <p className="mt-3 text-[11px] text-clay-haze/70">{t("crisisFoot", lang)}</p>
    </div>
  );
}
