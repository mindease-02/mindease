"use client";
/**
 * MindEase asking, in the flow of the chat, whether a technique would help right
 * now. Shown only when the pipeline decided it's actually warranted (high
 * intensity anger/anxiety, or arriving that way), never from a menu.
 */
import { t } from "@/lib/i18n";

export type TechKind = "box" | "sigh" | "ground" | "move";

const OPTIONS: { kind: TechKind; label: string; blurb: string }[] = [
  { kind: "box", label: "techBox", blurb: "boxBlurb" },
  { kind: "sigh", label: "techSigh", blurb: "sighBlurb" },
  { kind: "ground", label: "techGround", blurb: "groundBlurb" },
  { kind: "move", label: "techMove", blurb: "moveBlurb" },
];

export default function TechniqueOffer({ reason, suggested, onPick, onDismiss, lang = "en" }: { reason: string; suggested: TechKind[]; onPick: (k: TechKind) => void; onDismiss: () => void; lang?: string }) {
  const opts = suggested.length ? OPTIONS.filter((o) => suggested.includes(o.kind)) : OPTIONS;
  return (
    <div className="offer bubble-ai" role="group" aria-label={t("offerAria", lang)}>
      <p className="offer-q">{reason}</p>
      <div className="offer-opts">
        {opts.map((o) => (
          <button key={o.kind} type="button" className="offer-opt" onClick={() => onPick(o.kind)}>
            <b>{t(o.label, lang)}</b><span>{t(o.blurb, lang)}</span>
          </button>
        ))}
        <button type="button" className="offer-opt dim" onClick={onDismiss}><b>{t("notNow", lang)}</b><span>{t("keepTalking", lang)}</span></button>
      </div>
    </div>
  );
}
