"use client";
import { NEARBY_HELP_URL, type Helpline } from "@/lib/safety/resources";

/** Rendered from hard-coded data only. The model never supplies a number. */
export default function CrisisCard({ helplines, emergency }: { helplines: Helpline[]; emergency: string }) {
  return (
    <div className="clay-dark animate-rise mx-auto my-3 w-full max-w-lg p-5">
      <div className="text-[11px] uppercase tracking-widest text-clay-haze">You don&apos;t have to carry this alone right now</div>
      <p className="mt-2 text-sm leading-relaxed text-clay-surface">
        These are real people, available now, and talking to them is not an overreaction. If you&apos;re in immediate danger, call <strong>{emergency}</strong>.
      </p>
      <ul className="mt-3 space-y-2">
        {helplines.map((h) => (
          <li key={h.name} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-2xl bg-white/5 px-4 py-2.5 text-sm">
            <span className="font-medium text-clay-surface">{h.name}</span>
            <span className="text-clay-peach">{h.url ? <a href={h.url} target="_blank" rel="noreferrer" className="underline decoration-clay-peach/40">{h.contact}</a> : h.contact}</span>
            {h.note && <span className="w-full text-xs text-clay-haze/80">{h.note}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-clay-surface">Not an emergency, but heavy for a while? <a href={NEARBY_HELP_URL} target="_blank" rel="noreferrer" className="underline decoration-clay-peach/40 text-clay-peach">Find someone near you</a>.</p>
      <p className="mt-3 text-[11px] text-clay-haze/70">MindEase is software and cannot keep you safe. This card stays until you say you&apos;re okay.</p>
    </div>
  );
}
