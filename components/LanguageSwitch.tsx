"use client";
import { useRouter } from "next/navigation";
import { LANGUAGES, UI_LANGS, t } from "@/lib/i18n";
import { PxGlobe } from "./home/pixelIcons";

/**
 * The language control. Sets a cookie so the pages before sign-in follow it,
 * and, when signed in, saves it as the person's reply language too.
 */
export default function LanguageSwitch({ lang, signedIn, compact = false }: { lang: string; signedIn?: boolean; compact?: boolean }) {
  const router = useRouter();
  const value = UI_LANGS.includes(lang as (typeof UI_LANGS)[number]) ? lang : "en";
  async function change(id: string) {
    document.cookie = `me.lang=${id}; path=/; max-age=31536000; samesite=lax`;
    if (signedIn) await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: id }) }).catch(() => {});
    router.refresh();
  }
  return (
    <label className={`lang-switch ${compact ? "compact" : ""}`} title={t("language", lang)}>
      <PxGlobe className="pxicon" />
      <select value={value} onChange={(e) => change(e.target.value)} aria-label={t("language", lang)}>
        {LANGUAGES.filter((l) => l.id !== "auto").map((l) => <option key={l.id} value={l.id}>{l.native}</option>)}
      </select>
    </label>
  );
}
