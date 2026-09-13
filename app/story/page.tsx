import "../home.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth";
import { body, display, heading } from "@/components/home/fonts";
import ThemeInit from "@/components/home/ThemeInit";
import TrustStrip from "@/components/TrustStrip";
import WeekCard from "@/components/reflection/WeekCard";
import MemoryList from "@/components/profile/MemoryList";
import { getStore, migrate } from "@/lib/store";
import { weeklyReflection } from "@/lib/reflection";
import { t } from "@/lib/i18n";
import { pageLanguage } from "@/lib/i18n/server";

const KINDS: [string, string][] = [["person", "stPeople"], ["struggle", "stStruggles"], ["goal", "stGoals"], ["event", "stEvents"], ["past", "stPast"], ["routine", "stRoutine"], ["preference", "stPrefs"], ["fact", "stFacts"]];
const MS: Record<string, string> = { reframe: "msReframe", named_help: "msNamedHelp", noticed: "msNoticed", plan: "msPlan" };

/**
 * The story so far: everything MindEase remembers, grouped by what it is,
 * and the moments the person noticed something themselves. A retrospective
 * to read, not a score to beat.
 */
export default async function StoryPage() {
  const session = await currentSession();
  if (!session) redirect("/login");
  const raw = await getStore().get(session.userId);
  if (!raw) redirect("/mood");
  const state = migrate(raw);
  const now = Date.now();
  const lang = await pageLanguage(state.language);
  const loc = lang === "en" ? "en-IN" : `${lang}-IN`;
  const fmt = (x: number) => new Date(x).toLocaleDateString(loc, { day: "numeric", month: "short" });
  const groups = KINDS.map(([k, key]) => ({ key, items: state.memories.filter((m) => m.kind === k).sort((a, b) => a.at - b.at) })).filter((g) => g.items.length);
  const moments = (state.milestones ?? []).slice().reverse();
  const r = weeklyReflection(state, now);

  return (
    <div className={`world profile-world ${display.variable} ${heading.variable} ${body.variable}`}>
      <ThemeInit />
      <div className="atmos" aria-hidden /><div className="vignette" aria-hidden /><div className="grain" aria-hidden />
      <header className="nav"><div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" className="display no-underline" style={{ color: "var(--ink)", fontSize: "1.35rem" }}>MindEase</Link>
        <Link href="/chat" className="btn" style={{ padding: "10px 18px" }}>← {t("backToChat", lang)}</Link>
      </div></header>
      <TrustStrip lang={lang} />
      <main className="container profile story-page" id="main">
        <h1 className="display">{t("stTitle", lang)}</h1>
        <p className="muted story-sub">{t("stSub", lang)}</p>

        <section className="pcard">
          <h2 className="display">{t("wkTitle", lang)}</h2>
          <div className="pcard-body"><WeekCard r={r} lang={lang} /></div>
        </section>

        <section className="pcard">
          <h2 className="display">{t("stMoments", lang)}</h2>
          <div className="pcard-body">
            {moments.length ? (
              <ul className="moments">
                {moments.map((m) => <li key={m.at}><span className="moment-when">{fmt(m.at)}</span><span className="moment-what">{t(MS[m.kind] ?? "msNoticed", lang)}</span><q>{m.text}</q></li>)}
              </ul>
            ) : <p className="muted">{t("stNoMoments", lang)}</p>}
          </div>
        </section>

        <section className="pcard" id="memories">
          <h2 className="display">{t("knowsTitle", lang)}</h2>
          <p className="muted pcard-hint">{t("memPromise", lang)}</p>
          <div className="pcard-body">
            {groups.length ? <MemoryList lang={lang} groups={groups.map((g) => ({ key: g.key, items: g.items.map((m) => ({ id: m.id, kind: m.kind, text: m.text, when: fmt(m.at) })) }))} /> : <p className="muted">{t("stEmpty", lang)}</p>}
          </div>
        </section>
        <p className="muted" style={{ fontSize: ".85rem" }}><Link href="/profile">{t("profileResults", lang)}</Link></p>
      </main>
    </div>
  );
}
