import Chapter from "./Chapter";
import { moodText, t } from "@/lib/i18n";
import { PALETTES } from "@/lib/theme";
import { PxArrow } from "./pixelIcons";

/**
 * The focus room: a brand orb breathing inside the particle rings, three
 * sparks on orbit, the title, one sentence, a row of mood chips that carry
 * the mood into the arrival page, and a single call to action.
 */
const CHIPS = ["anxious", "heavy", "numb", "okay", "lonely"];

export default function Start({ chatHref, lang }: { chatHref: string; lang: string }) {
  return (
    <Chapter id="start" length={1.6} className="ch-start" label={t("navStart", lang)}>
      <div className="beat beat-cta" data-beat data-in="0" data-out="1">
        <div className="container cta-stage">
          <div className="room">
            <div className="orb-wrap" aria-hidden>
              <div className="brand-orb" />
              <div className="orbit o1"><i /></div><div className="orbit o2"><i /></div><div className="orbit o3"><i /></div>
            </div>
            <h2 id="start-title" className="display">{t("ctaTitle", lang)}</h2>
            <p className="room-p">{t("ctaP", lang)}</p>
            <div className="mood-chips" role="group" aria-labelledby="start-title">
              {CHIPS.map((id) => {
                const p = PALETTES.find((x) => x.id === id), m = moodText(id, lang);
                if (!p || !m) return null;
                return <a key={id} href={`${chatHref}?mood=${id}`} className="mood-chip" style={{ ["--c" as string]: p.accent }}><i className="dot" aria-hidden />{m[0]}</a>;
              })}
            </div>
            <div className="ctas">
              <a href={chatHref} className="btn btn-primary btn-halo">{t("startTalking", lang)} <PxArrow className="pxicon" /></a>
            </div>
            <p className="cta-note">{t("footNot", lang)}</p>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
