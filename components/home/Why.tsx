import { t } from "@/lib/i18n";
import Chapter from "./Chapter";
import MoodOrb from "./MoodOrbMount";

/**
 * Why MindEase exists, told over the two particle ribbons: people in your
 * life rising, leaning on MindEase falling, check-ins thinning out. The
 * quote plays one line at a time; the chart's labels sit on the ribbons
 * themselves (the scene projects their ends to the screen each frame). The
 * chapter ends on the colour-changing ball: pick how you are arriving.
 */
const splitSentences = (s: string) => s.trim().split(/(?<=[.।!?])\s+/).filter(Boolean);

export default function Why({ lang }: { lang: string }) {
  const rest = splitSentences(t("storyQ2", lang));
  const last = rest.length > 1 ? rest[rest.length - 1] : null;
  const middle = rest.length > 1 ? rest.slice(0, -1).join(" ") : rest[0] ?? "";
  const q1 = t("storyQ1", lang), em = t("storyEm", lang);
  // Beats: the first line, the turn, the answer (if the copy has one), then the ball.
  const beats = last ? [[0, 0.24], [0.24, 0.46], [0.46, 0.7]] : [[0, 0.34], [0.34, 0.7]];
  return (
    <Chapter id="why" length={3.6} className="ch-why" label={t("navWhy", lang)}>
      <div className="why-labels" aria-hidden data-beat data-in="0.05" data-out="0.72" data-fade="0.08">
        <span className="wl ppl" style={{ left: "var(--why-ppl-x)", top: "var(--why-ppl-y)" }}>{t("whyPeople", lang)}</span>
        <span className="wl app" style={{ left: "var(--why-app-x)", top: "var(--why-app-y)" }}>{t("whyApp", lang)}</span>
        <span className="wl wk" style={{ left: "var(--why-w1-x)", top: "var(--why-w1-y)" }}>{t("whyWeek1", lang)}</span>
        <span className="wl wk" style={{ left: "var(--why-w8-x)", top: "var(--why-w8-y)" }}>{t("whyWeek8", lang)}</span>
      </div>
      <div className="beat beat-line" data-beat data-in={beats[0][0]} data-out={beats[0][1]}>
        <div className="container"><p className="eyebrow">{t("whyExists", lang)}</p><h2 className="display line">{q1}<em>{em}</em></h2></div>
      </div>
      <div className="beat beat-line" data-beat data-in={beats[1][0]} data-out={beats[1][1]}>
        <div className="container"><p className="display line">{middle}</p>{!last && <p className="line-cap">{t("whyCaption", lang)}</p>}</div>
      </div>
      {last && (
        <div className="beat beat-line" data-beat data-in={beats[2][0]} data-out={beats[2][1]}>
          <div className="container"><p className="display line strong">{last}</p><p className="line-cap">{t("whyCaption", lang)}</p></div>
        </div>
      )}
      <div className="beat beat-orb" data-beat data-in="0.72" data-out="1" data-fy="-0.9" data-dim="0.3">
        <div className="container">
          <p className="eyebrow">{t("xp6Top", lang)} {t("xp6Bottom", lang)}</p>
          <MoodOrb lang={lang} />
        </div>
      </div>
      <p className="sr-only">{t("whyAlt", lang)}</p>
    </Chapter>
  );
}
