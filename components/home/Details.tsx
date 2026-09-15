"use client";
import { useRef, useState } from "react";
import { t } from "@/lib/i18n";
import Reveal from "./Reveal";
import Spotlight from "./Spotlight";
import TryMirror from "./TryMirror";
import Compare from "./Compare";
import { FeatCheckins, FeatMemory } from "./Sections";

type Tab = { id: string; label: string; panel: React.ReactNode; focusable?: boolean };

/**
 * An accessible tab set (WAI-ARIA tabs pattern, automatic activation): one
 * row of tabs, one panel showing at a time. Arrow keys move between tabs and
 * select as they go; Home and End jump to the ends; only the selected tab sits
 * in the Tab order. Every panel stays mounted, so a half-typed line or a
 * forgotten memory card survives a switch.
 */
function DetailTabs({ tabs, labelledBy }: { tabs: Tab[]; labelledBy: string }) {
  const [sel, setSel] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (i: number, focus: boolean) => {
    const n = (i + tabs.length) % tabs.length;
    setSel(n);
    if (!focus) return;
    const b = refs.current[n];
    b?.focus();
    b?.scrollIntoView({ inline: "nearest", block: "nearest" });
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight") select(i + 1, true);
    else if (e.key === "ArrowLeft") select(i - 1, true);
    else if (e.key === "Home") select(0, true);
    else if (e.key === "End") select(tabs.length - 1, true);
    else return;
    e.preventDefault();
  };

  return (
    <div className="dtabs" data-reveal>
      <div role="tablist" aria-labelledby={labelledBy} className="dtabs-list">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={`dtab-${tab.id}`}
            className="dtab"
            aria-selected={i === sel}
            aria-controls={`dpanel-${tab.id}`}
            tabIndex={i === sel ? 0 : -1}
            onClick={() => select(i, false)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`dpanel-${tab.id}`}
          aria-labelledby={`dtab-${tab.id}`}
          className={`dt dt-panel dt-panel-${tab.id}`}
          hidden={i !== sel}
          // A panel with nothing focusable inside still needs to be reachable by keyboard.
          tabIndex={tab.focusable === false ? 0 : undefined}
        >
          <div className="dt-body">{tab.panel}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * The mechanics, after the call to action rather than before it: four tabs,
 * nothing folded away. The live read comes first because it is the one a
 * visitor can actually try.
 */
export default function Details({ lang }: { lang: string }) {
  const tabs: Tab[] = [
    { id: "try", label: t("tryTitle", lang), panel: <TryMirror lang={lang} embedded /> },
    { id: "memory", label: t("f2T", lang), panel: <FeatMemory lang={lang} embedded /> },
    { id: "checkins", label: t("f3T", lang), panel: <FeatCheckins lang={lang} embedded /> },
    { id: "compare", label: t("cmpTitle", lang), panel: <Compare lang={lang} embedded />, focusable: false },
  ];
  return (
    <Reveal as="section" id="details" className="block details" aria-labelledby="details-title">
      <Spotlight />
      <div className="container">
        <div className="sec-head" data-reveal>
          <h2 id="details-title" className="display">{t("detailsTitle", lang)}</h2>
          <p>{t("detailsSub", lang)}</p>
        </div>
        <DetailTabs tabs={tabs} labelledBy="details-title" />
      </div>
    </Reveal>
  );
}
