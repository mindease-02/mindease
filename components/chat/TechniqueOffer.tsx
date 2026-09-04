"use client";
/**
 * Ori asking, in the flow of the chat, whether a technique would help right
 * now. Shown only when the pipeline decided it's actually warranted (high
 * intensity anger/anxiety, or arriving that way), never from a menu.
 */
export type TechKind = "box" | "sigh" | "ground" | "move";

const OPTIONS: { kind: TechKind; label: string; blurb: string }[] = [
  { kind: "box", label: "Box breathing", blurb: "4 in · 4 hold · 4 out · 4 hold" },
  { kind: "sigh", label: "Physiological sigh", blurb: "two sips in, one long out" },
  { kind: "ground", label: "5-4-3-2-1", blurb: "come back to the room" },
  { kind: "move", label: "Move it", blurb: "shake out, cold water, walk" },
];

export default function TechniqueOffer({ reason, suggested, onPick, onDismiss }: { reason: string; suggested: TechKind[]; onPick: (k: TechKind) => void; onDismiss: () => void }) {
  const opts = suggested.length ? OPTIONS.filter((o) => suggested.includes(o.kind)) : OPTIONS;
  return (
    <div className="offer bubble-ai" role="group" aria-label="Ori is offering a technique">
      <p className="offer-q">{reason}</p>
      <div className="offer-opts">
        {opts.map((o) => (
          <button key={o.kind} type="button" className="offer-opt" onClick={() => onPick(o.kind)}>
            <b>{o.label}</b><span>{o.blurb}</span>
          </button>
        ))}
        <button type="button" className="offer-opt dim" onClick={onDismiss}><b>Not now</b><span>keep talking</span></button>
      </div>
    </div>
  );
}
