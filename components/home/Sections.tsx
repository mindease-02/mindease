"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Reveal, { Words } from "./Reveal";
import { bindLift, bindParallax, popIn } from "@/lib/motion";
import Magnetic from "./Magnetic";
import ThemeSwatches from "./ThemeSwatches";
import DemoGauge from "./DemoGauge";
import { t } from "@/lib/i18n";
import { PxEye, PxBrain, PxBell, PxShield, PxPlay, PxRefresh, PxCheck, PxHand, PxArrow, PxHeart, PxStar, PxMoon, PxMessage, PxMinus } from "./pixelIcons";

const I = {
  eye: <PxEye className="pxicon" />, memory: <PxBrain className="pxicon" />, bell: <PxBell className="pxicon" />, shield: <PxShield className="pxicon" />,
  play: <PxPlay className="pxicon" />, pause: <PxHand className="pxicon" />, replay: <PxRefresh className="pxicon" />, check: <PxCheck className="pxicon" />,
  minus: <PxMinus className="pxicon" />, arrow: <PxArrow className="pxicon" />,
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
    <Reveal as="section" id="demo" className="block" aria-labelledby="demo-title">
      <div className="container">
        <div className="sec-head">
          <div className="eyebrow" data-reveal>{t("seeIt", lang)}</div>
          <h2 id="demo-title" className="display" data-reveal style={{ ["--d" as string]: "80ms" }}><Words text={t("demoTitle", lang)} step={45} /></h2>
        </div>
        <div className="demo">
          <div ref={host} className="device" data-reveal role="region" aria-label={t("demoLabel", lang)}>
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
          <div className="demo-copy" data-reveal style={{ ["--d" as string]: "120ms" }}>
            <h3>{t("demoH3", lang)}</h3>
            <p>{t("demoP", lang)}</p>
            <div className="list" data-stagger>
              <div>{I.eye}<div><b>{t("readT", lang)}</b><p>{t("readP", lang)}</p></div></div>
              <div>{I.shield}<div><b>{t("gapT", lang)}</b><p>{t("gapP", lang)}</p></div></div>
              <div>{I.memory}<div><b>{t("rememberT", lang)}</b><p>{t("rememberP", lang)}</p></div></div>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------- One feature per row */
function Wheel() {
  const axes = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"];
  const today = [0.2, 0.35, 0.7, 0.2, 0.55, 0.1, 0.25, 0.4];
  const climate = [0.35, 0.45, 0.4, 0.25, 0.4, 0.15, 0.2, 0.5];
  const pt = (v: number, i: number, r = 120) => { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; return `${160 + Math.cos(a) * r * v},${160 + Math.sin(a) * r * v}`; };
  return (
    <svg className="wheel" viewBox="0 0 320 320" role="img" aria-label="Eight emotional axes: today's shape over the recent climate">
      {[0.33, 0.66, 1].map((r) => <circle key={r} cx="160" cy="160" r={120 * r} fill="none" stroke="currentColor" strokeOpacity=".12" />)}
      {axes.map((_, i) => <line key={i} x1="160" y1="160" x2={pt(1, i).split(",")[0]} y2={pt(1, i).split(",")[1]} stroke="currentColor" strokeOpacity=".12" />)}
      <polygon points={climate.map((v, i) => pt(v, i)).join(" ")} fill="var(--color-secondary)" fillOpacity=".18" stroke="var(--color-secondary)" strokeOpacity=".6" />
      <polygon points={today.map((v, i) => pt(v, i)).join(" ")} fill="var(--color-primary)" fillOpacity=".28" stroke="var(--color-primary)" strokeWidth="1.5" />
      {axes.map((a, i) => { const [x, y] = pt(1.22, i).split(",").map(Number); return <text key={a} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="currentColor" fillOpacity=".7">{a}</text>; })}
    </svg>
  );
}

export function FeatureRows({ chatHref = "/login", lang }: { chatHref?: string } & L) {
  useEffect(() => {
    const unbind: (() => void)[] = [];
    document.querySelectorAll<HTMLElement>(".feat-visual").forEach((el) => unbind.push(bindParallax(el, el.closest(".feat") as HTMLElement, 24, -24)));
    document.querySelectorAll<HTMLElement>(".cutout").forEach((el) => unbind.push(bindParallax(el, el.closest(".feat") as HTMLElement, 60, -60)));
    const big = document.querySelector<HTMLElement>(".wordmark .big"); if (big) unbind.push(bindParallax(big, big.closest("footer") as HTMLElement, 40, -10));
    document.querySelectorAll<HTMLElement>(".feat-visual, .device").forEach((el) => unbind.push(bindLift(el, { lift: -6, scale: 1.01 })));
    return () => unbind.forEach((u) => u());
  }, []);
  const chips = [["f2c1k", "f2c1"], ["f2c2k", "f2c2"], ["f2c3k", "f2c3"], ["f2c4k", "f2c4"]];
  const gates: [string, string, string][] = [["ok", t("g1", lang), "trend 0.68"], ["ok", t("g2", lang), "22:30 → 08:00"], ["ok", t("g3", lang), t("g3v", lang)], ["no", t("g4", lang), t("g4v", lang)]];
  return (
    <Reveal as="section" id="features" className="band">
      <div className="container">
        <div className="sec-head" style={{ marginBottom: 24 }}>
          <div className="eyebrow" data-reveal>{t("whatItDoes", lang)}</div>
          <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}><Words text={t("threeThings", lang)} step={50} /></h2>
        </div>

        <div className="feat" data-reveal>
          <span className="cutout a" aria-hidden><PxEye /></span>
          <div>
            <div className="icon">{I.eye}</div>
            <h3 className="display">{t("f1T", lang)}</h3>
            <p>{t("f1P", lang)}</p>
            <ul><li>{t("f1L1", lang)}</li><li>{t("f1L2", lang)}</li><li>{t("f1L3", lang)}</li></ul>
          </div>
          <div className="feat-visual" aria-hidden><Wheel /></div>
        </div>

        <div className="feat flip" data-reveal>
          <span className="cutout b" aria-hidden><PxBrain /></span>
          <div>
            <div className="icon">{I.memory}</div>
            <h3 className="display">{t("f2T", lang)}</h3>
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

        <div className="feat" data-reveal>
          <span className="cutout c" aria-hidden><PxBell /></span>
          <div>
            <div className="icon">{I.bell}</div>
            <h3 className="display">{t("f3T", lang)}</h3>
            <p>{t("f3P", lang)}</p>
            <ul><li>{t("f3L1", lang)}</li><li>{t("f3L2", lang)}</li><li>{t("f3L3", lang)}</li></ul>
          </div>
          <div className="feat-visual" aria-hidden>
            <div className="line mindease in" style={{ maxWidth: "100%", opacity: 1, transform: "none", padding: "12px 14px", borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--color-border)", fontSize: ".9rem" }}>
              <span style={{ display: "block", fontSize: ".8rem", color: "var(--color-accent)", marginBottom: 4 }}>{t("f3Why", lang)}</span>
              {t("f3Msg", lang)}
            </div>
            <div className="gates" data-stagger>
              {gates.map(([s, label, v]) => (
                <div className={`gate ${s}`} key={label}>{s === "ok" ? I.check : I.minus}<b>{label}</b><span>{v}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="mid-cta" data-reveal>
          <Magnetic href={chatHref} className="btn-primary btn-sticker">{t("startTalking", lang)} {I.arrow}</Magnetic>
        </div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------- Story */
export function Story({ lang }: L) {
  return (
    <Reveal as="section" id="story" className="block">
      <div className="container story">
        <div>
          <div className="eyebrow" data-reveal>{t("whyExists", lang)}</div>
          <blockquote className="display" data-reveal style={{ ["--d" as string]: "80ms", marginTop: 16 }}>
            {t("storyQ1", lang)}<em>{t("storyEm", lang)}</em>{t("storyQ2", lang)}
          </blockquote>
          <p className="body" data-reveal style={{ ["--d" as string]: "200ms", marginTop: 24 }}>{t("storyP", lang)}</p>
        </div>
        <ThemeSwatches />
      </div>
    </Reveal>
  );
}

/* --------------------------------------------------------------------- CTA */
export function Cta({ chatHref, lang }: { chatHref: string } & L) {
  return (
    <Reveal as="section" id="start" className="block">
      <div className="container">
        <div className="cta" data-reveal>
          <div className="light" /><div className="planet" />
          <h2 className="display"><Words text={t("ctaTitle", lang)} step={50} /></h2>
          <p>{t("ctaP", lang)}</p>
          <div className="ctas">
            <Magnetic href={chatHref} className="btn-primary">{t("startTalking", lang)} {I.arrow}</Magnetic>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ Footer */
export function Footer({ lang }: L) {
  return (
    <footer>
      <div className="wordmark" aria-hidden>
        <div className="path" />
        <span className="float"><PxHeart /></span><span className="float"><PxStar /></span><span className="float"><PxMoon /></span><span className="float"><PxMessage /></span>
        <div className="big">MindEase</div>
      </div>
      <div className="container">
        <div className="foot">
          <div>
            <div className="display" style={{ fontSize: "1.6rem" }}>MindEase</div>
            <p className="muted" style={{ maxWidth: "24rem", fontWeight: 300, lineHeight: 1.6, marginTop: 10 }}>{t("footBlurb", lang)}</p>
          </div>
          <div><h5>{t("product", lang)}</h5><a href="#demo">{t("seeIt", lang)}</a><a href="#features">{t("navWhat", lang)}</a><a href="#story">{t("navWhy", lang)}</a><a href="#start">{t("navStart", lang)}</a></div>
          <div><h5>{t("crisisLines", lang)}</h5><a href="https://telemanas.mohfw.gov.in" target="_blank" rel="noreferrer">Tele-MANAS 14416</a><a href="tel:+917893078930">1Life +91 78930 78930</a><a href="tel:+919999666555">Vandrevala +91 9999 666 555</a><a href="tel:112">Emergency 112</a></div>
          <div><h5>{t("hwTitle", lang)}</h5><a href="/how-it-works">{t("hwTitle", lang)}</a><a href="/help">{t("helpNow", lang)}</a></div>
          <div><h5>{t("source", lang)}</h5><a href="https://github.com/mindease-02/mindease" target="_blank" rel="noreferrer">GitHub</a><Link href="/login">{t("signIn", lang)}</Link></div>
        </div>
        <div className="foot-bottom"><span>© {new Date().getFullYear()} MindEase</span><span>{t("icons", lang)}: <a href="https://lucide.dev" target="_blank" rel="noreferrer" style={{ display: "inline" }}>Lucide</a> (ISC)</span><span>{t("footNot", lang)}</span></div>
      </div>
    </footer>
  );
}
