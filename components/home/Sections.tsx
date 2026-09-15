"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { popIn } from "@/lib/motion";
import Reveal from "./Reveal";
import Chapter from "./Chapter";
import DemoGauge from "./DemoGauge";
import { sentences, t } from "@/lib/i18n";
import { PxEye, PxBrain, PxShield, PxPlay, PxRefresh, PxHand, PxArrow, PxCheck, PxHeart, PxStar, PxMoon, PxMessage } from "./pixelIcons";

const I = {
  eye: <PxEye className="pxicon" />, memory: <PxBrain className="pxicon" />, shield: <PxShield className="pxicon" />,
  play: <PxPlay className="pxicon" />, pause: <PxHand className="pxicon" />, replay: <PxRefresh className="pxicon" />, check: <PxCheck className="pxicon" />,
  arrow: <PxArrow className="pxicon" />,
};

type L = { lang: string };

/* ------------------------------------------------------------- Product demo */
const ZERO_READ = [0, 0, 0, 0, 0, 0, 0, 0];

/* The read behind each MindEase line, in axis order: joy, trust, fear, surprise, sadness, disgust, anger, anticipation. */
const READS: { axes: number[]; confidence: number }[] = [
  { axes: [0.05, 0.2, 0.62, 0.1, 0.45, 0.05, 0.12, 0.35], confidence: 0.58 },
  { axes: [0.05, 0.25, 0.72, 0.12, 0.3, 0.08, 0.15, 0.6], confidence: 0.74 },
  { axes: [0.22, 0.45, 0.38, 0.1, 0.2, 0.04, 0.06, 0.4], confidence: 0.71 },
];

function script(lang: string): { who: "you" | "mindease"; text: string; cap?: [string, string]; read?: number }[] {
  return [
    { who: "you", text: t("demoU1", lang) },
    { who: "mindease", text: t("demoM1", lang), cap: [t("demoC1k", lang), t("demoC1v", lang)], read: 0 },
    { who: "you", text: t("demoU2", lang) },
    { who: "mindease", text: t("demoM2", lang), cap: [t("demoC2k", lang), t("demoC2v", lang)], read: 1 },
    { who: "you", text: t("demoU3", lang) },
    { who: "mindease", text: t("demoM3", lang), cap: [t("demoC3k", lang), t("demoC3v", lang)], read: 2 },
  ];
}

export function Demo({ lang }: L) {
  const SCRIPT = script(lang);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [typing, setTyping] = useState(false);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) { setStep(SCRIPT.length); setPlaying(false); setStarted(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!playing || step >= SCRIPT.length) { setTyping(false); return; }
    const next = SCRIPT[step];
    const wait = step === 0 ? 500 : 1500;
    const t1 = setTimeout(() => { if (next.who === "mindease") setTyping(true); }, Math.max(0, wait - 900));
    const t2 = setTimeout(() => { setTyping(false); setStep((s) => s + 1); }, next.who === "mindease" ? wait + 700 : wait);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, step]);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => { const lines = host.current?.querySelectorAll(".device-body .line, .device-body .cap"); if (lines?.length) popIn(lines[lines.length - 1]); }, [step, typing]);
  useEffect(() => {
    const el = host.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setPlaying(false); });
    io.observe(el); return () => io.disconnect();
  }, []);
  const done = step >= SCRIPT.length;
  const shownReads = SCRIPT.slice(0, step).filter((l) => l.read !== undefined);
  const current = shownReads.length ? READS[shownReads[shownReads.length - 1].read!] : null;
  const gaugeTarget = current ? current.axes : ZERO_READ;

  return (
    <Chapter id="demo" length={2.6} className="ch-demo" label={t("seeIt", lang)}>
      <div className="beat beat-line" data-beat data-in="0" data-out="0.4">
        <div className="container">
          <p className="eyebrow">{t("seeIt", lang)}</p>
          <h2 id="demo-title" className="display line">{t("demoTitle", lang)}</h2>
          <div className="demo-points">
            <div>{I.eye}<div><b>{t("readT", lang)}</b><p>{t("readP", lang)}</p></div></div>
            <div>{I.shield}<div><b>{t("gapT", lang)}</b><p>{t("gapP", lang)}</p></div></div>
            <div>{I.memory}<div><b>{t("rememberT", lang)}</b><p>{t("rememberP", lang)}</p></div></div>
          </div>
        </div>
      </div>
      <div className="beat beat-device" data-beat data-in="0.4" data-out="1" data-fx="-3.6" data-fy="0.3" data-dim="0.85">
        <div className="container demo-stage">
          <div className="demo-side">
            <h3>{t("demoH3", lang)}</h3>
            <p>{t("demoP", lang)}</p>
          </div>
          <div ref={host} className="device" role="region" aria-label={t("demoLabel", lang)}>
            <div className="device-head"><span className="dot" aria-hidden />MindEase <span className="muted">{t("demoLabel", lang)}</span></div>
            {!started && (
              <button type="button" className="demo-play" onClick={() => { setStarted(true); setPlaying(true); }} aria-label={t("playSub", lang)}>
                <span className="demo-play-ico">{I.play}</span>
                <b>{t("playBig", lang)}</b>
                <span>{t("playSub", lang)}</span>
              </button>
            )}
            <div className="device-body" aria-live="polite">
              {SCRIPT.map((l, i) => (
                <div key={i} style={{ display: "contents" }}>
                  {i < step && <div className={`line ${l.who} in`}>{l.text}</div>}
                  {i < step && l.cap && <div className="cap in"><b>{l.cap[0]}:</b> {l.cap[1]}</div>}
                </div>
              ))}
              {typing && <div className="line mindease in typing" aria-label="MindEase is typing"><i /><i /><i /></div>}
            </div>
            <DemoGauge target={gaugeTarget} lang={lang} confidence={current?.confidence ?? null} />
            <div className="device-foot">
              <div className="prog" aria-hidden>{SCRIPT.map((_, i) => <i key={i} className={i < step ? "on" : ""} />)}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {!done && started && <button className="ctl" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>{playing ? I.pause : I.play}<span>{playing ? t("pause", lang) : t("play", lang)}</span></button>}
                {(done || step > 0) && <button className="ctl" onClick={() => { setStep(0); setStarted(true); setPlaying(true); }}>{I.replay}<span>{t("replay", lang)}</span></button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Chapter>
  );
}

export function FeatMemory({ lang, embedded = false }: L & { embedded?: boolean }) {
  const chips = [["f2c1k", "f2c1"], ["f2c2k", "f2c2"], ["f2c3k", "f2c3"], ["f2c4k", "f2c4"]];
  return (
    <div className="feat flip">
      <div>
        {!embedded && <h3 className="display">{t("f2T", lang)}</h3>}
        <p>{t("f2P", lang)}</p>
        <ul><li>{t("f2L1", lang)}</li><li>{t("f2L2", lang)}</li><li>{t("f2L3", lang)}</li></ul>
      </div>
      <div className="feat-visual" aria-hidden>
        <div className="chips" data-stagger>
          {chips.map(([k, v]) => (
            <div className="chip-mem" key={v}><span className="k">{t(k, lang)}</span>{t(v, lang)}<span className="x">{t("forget", lang)}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------- Check-ins, as three glyphs */
/**
 * The three things a check-in has to pass, drawn rather than listed: two of
 * four signals agreeing, the clock outside quiet hours, one of two used today.
 * Coral marks the state that is true, the faint outline the one that is not.
 */
export function CheckinGlyphs({ lang }: L) {
  return (
    <div className="glyphs" role="img" aria-label={`${t("g1", lang)}. ${t("g2", lang)}. ${t("g3", lang)}: ${t("g3v", lang)}.`}>
      <figure>
        <svg viewBox="0 0 84 44" width="84" height="44"><g>
          <circle cx="12" cy="22" r="8" fill="var(--color-primary)" /><circle cx="32" cy="22" r="8" fill="var(--color-primary)" />
          <circle cx="52" cy="22" r="8" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.5" /><circle cx="72" cy="22" r="8" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.5" />
        </g></svg>
        <figcaption>{t("g1", lang)}</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 44 44" width="44" height="44">
          <circle cx="22" cy="22" r="16" fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth="5" />
          <path d="M22 6 A16 16 0 1 1 8.14 30" fill="none" stroke="var(--color-secondary)" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" />
          <line x1="22" y1="22" x2="31" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="22" cy="22" r="2" fill="currentColor" />
        </svg>
        <figcaption>{t("g2", lang)}</figcaption>
      </figure>
      <figure>
        <svg viewBox="0 0 44 44" width="44" height="44">
          <rect x="6" y="12" width="14" height="20" rx="5" fill="var(--color-primary)" /><rect x="24" y="12" width="14" height="20" rx="5" fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.5" />
        </svg>
        <figcaption>{t("g3v", lang)}</figcaption>
      </figure>
    </div>
  );
}

export function FeatCheckins({ lang, embedded = false }: L & { embedded?: boolean }) {
  return (
    <div className="feat">
      <div>
        {!embedded && <h3 className="display">{t("f3T", lang)}</h3>}
        <p>{t("ciGlyphCap", lang)}</p>
      </div>
      <div className="feat-visual">
        <div className="line mindease in demo-msg" aria-hidden>
          <span className="demo-msg-why">{t("f3Why", lang)}</span>
          {t("f3Msg", lang)}
        </div>
        <CheckinGlyphs lang={lang} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- CTA */
export function Cta({ chatHref, lang }: { chatHref: string } & L) {
  const card = useRef<HTMLDivElement>(null);
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = card.current; if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`);
    el.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
  };
  const rest = () => { const el = card.current; if (el) { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); } };
  return (
    <Chapter id="start" length={2} className="ch-start" label={t("navStart", lang)}>
      <div className="beat beat-cta" data-beat data-in="0" data-out="1">
        <div className="container cta-stage">
          <div ref={card} className="cta" onPointerMove={tilt} onPointerLeave={rest}>
            <div className="glint" aria-hidden />
            <div className="orbit o1" aria-hidden><i /></div><div className="orbit o2" aria-hidden><i /></div><div className="orbit o3" aria-hidden><i /></div>
            <h2 className="display">{t("ctaTitle", lang)}</h2>
            <p>{t("ctaP", lang)}</p>
            <div className="ctas">
              <a href={chatHref} className="btn btn-primary btn-halo">{t("startTalking", lang)} {I.arrow}</a>
            </div>
            <p className="cta-note">{sentences(t("footNot", lang), t("priceLine", lang))}</p>
          </div>
        </div>
      </div>
    </Chapter>
  );
}

export function Footer({ lang }: L) {
  return (
    <footer>
      <Reveal className="wordmark" aria-hidden>
        <div className="path" data-reveal />
        <span className="float"><PxHeart /></span><span className="float"><PxStar /></span><span className="float"><PxMoon /></span><span className="float"><PxMessage /></span>
        <div className="big" data-reveal>{"MindEase".split("").map((ch, i) => <span key={i} className="ltr" style={{ ["--i" as string]: i }}>{ch}</span>)}</div>
      </Reveal>
      <Reveal className="container">
        <div className="foot" data-stagger>
          <div>
            <div className="display" style={{ fontSize: "1.6rem" }}>MindEase</div>
            <p className="muted" style={{ maxWidth: "24rem", fontWeight: 300, lineHeight: 1.6, marginTop: 10 }}>{t("footBlurb", lang)}</p>
          </div>
          <div><p className="foot-h">{t("product", lang)}</p><a href="#why">{t("navWhy", lang)}</a><a href="#demo">{t("seeIt", lang)}</a><a href="#start">{t("navStart", lang)}</a><a href="#details">{t("navDetails", lang)}</a></div>
          <div><p className="foot-h">{t("crisisLines", lang)}</p><a href="tel:14416">Tele-MANAS 14416</a><a href="tel:+917893078930">1Life +91 78930 78930</a><a href="tel:+919999666555">Vandrevala +91 9999 666 555</a><a href="tel:112">Emergency 112</a></div>
          <div><p className="foot-h">{t("hwTitle", lang)}</p><a href="/how-it-works">{t("hwTitle", lang)}</a><a href="/help">{t("helpNow", lang)}</a><a href="https://github.com/mindease-02/mindease" target="_blank" rel="noreferrer">{t("source", lang)}</a><Link href="/login">{t("signIn", lang)}</Link></div>
        </div>
        <div className="foot-bottom" data-reveal><span>© {new Date().getFullYear()} MindEase</span><span>{t("icons", lang)}: <a href="https://lucide.dev" target="_blank" rel="noreferrer" style={{ display: "inline" }}>Lucide</a> (ISC)</span><span>{t("footNot", lang)}</span></div>
      </Reveal>
    </footer>
  );
}
