"use client";
import { t } from "@/lib/i18n";
import MemoryCard from "../chat/MemoryCard";

/** Everything MindEase remembers, grouped by kind, each one editable and forgettable in one tap. */
export default function MemoryList({ groups, lang }: { groups: { key: string; items: { id: string; kind: string; text: string; when: string }[] }[]; lang: string }) {
  return (
    <div className="memlist">
      {groups.map((g) => (
        <div key={g.key} className="memlist-group">
          <h3>{t(g.key, lang)}</h3>
          {g.items.map((m) => <div key={m.id} className="memlist-item"><span className="moment-when">{m.when}</span><MemoryCard m={m} lang={lang} mode="kept" /></div>)}
        </div>
      ))}
    </div>
  );
}
