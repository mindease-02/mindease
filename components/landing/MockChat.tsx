/**
 * "Photos" of the chat for the landing page: static renders of the real bubble
 * styles, so what people see on the homepage is what the app looks like.
 */
import Orb from "../Orb";

export interface MockLine { who: "you" | "ori"; text: string; proactive?: boolean; time?: string }

export default function MockChat({ lines, caption, tilt = 0 }: { lines: MockLine[]; caption?: string; tilt?: number }) {
  return (
    <figure className="w-full max-w-sm" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="clay p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3 border-b border-clay-line/60 pb-3">
          <Orb size={28} pulse={false} />
          <div className="text-xs text-clay-muted">Ori</div>
          <div className="ml-auto text-[10px] uppercase tracking-widest text-clay-muted/70">companion</div>
        </div>
        <div className="flex flex-col gap-2.5 text-[13.5px] leading-relaxed">
          {lines.map((l, i) => (
            <div key={i} className={`flex ${l.who === "you" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${l.who === "you" ? "bubble-user" : l.proactive ? "bubble-proactive" : "bubble-ai"}`}>
                {l.proactive && <div className="mb-1 text-[10px] uppercase tracking-wider opacity-60">unprompted</div>}
                {l.text}
              </div>
            </div>
          ))}
        </div>
      </div>
      {caption && <figcaption className="mt-3 text-center text-xs text-clay-muted">{caption}</figcaption>}
    </figure>
  );
}
