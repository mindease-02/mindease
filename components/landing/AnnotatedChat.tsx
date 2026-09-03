/**
 * A "photo" of the chat with the reasoning shown beside each of Ori's turns:
 * what was read from the person's message, and which move that read led to.
 * This is the honest version of a marketing screenshot - the same pipeline
 * runs on every real turn, and the Mirror panel shows the same fields.
 */
import Orb from "../Orb";

export interface Turn {
  who: "you" | "ori";
  text: string;
  proactive?: boolean;
  /** For Ori turns: what the system read before answering. */
  read?: string;
  /** For Ori turns: the move chosen because of that read. */
  move?: string;
}

export default function AnnotatedChat({ turns, title }: { turns: Turn[]; title: string }) {
  return (
    <figure className="w-full">
      <div className="clay p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-3 border-b border-clay-line/60 pb-3">
          <Orb size={28} pulse={false} />
          <div className="text-xs text-clay-muted">Ori</div>
          <div className="ml-auto text-[10px] uppercase tracking-widest text-clay-muted/70">{title}</div>
        </div>
        <ol className="flex flex-col gap-3 text-[13.5px] leading-relaxed">
          {turns.map((t, i) => (
            <li key={i} className={`flex ${t.who === "you" ? "justify-end" : "flex-col items-start"}`}>
              <div className={`max-w-[88%] ${t.who === "you" ? "bubble-user" : t.proactive ? "bubble-proactive" : "bubble-ai"}`}>
                {t.proactive && <div className="mb-1 text-[10px] uppercase tracking-wider opacity-60">unprompted</div>}
                {t.text}
              </div>
              {t.who === "ori" && (t.read || t.move) && (
                <div className="mt-1.5 ml-2 grid max-w-[88%] gap-1 border-l-2 border-clay-cyan/60 pl-3 text-[11.5px] leading-snug text-clay-muted">
                  {t.read && <div><span className="font-medium text-clay-ink/80">Read:</span> {t.read}</div>}
                  {t.move && <div><span className="font-medium text-clay-ink/80">Move:</span> {t.move}</div>}
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
