"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { bindLift, popIn, reduced as reducedMotion, revealIn } from "@/lib/motion";
import Chapter from "./Chapter";
import DemoGauge from "./DemoGauge";
import { t } from "@/lib/i18n";
import { tx } from "@/lib/i18n/tx";
import { PxEye, PxBrain, PxShield, PxPlay, PxRefresh } from "./pixelIcons";

type L = { lang: string };
type Turn = { who: "you" | "mindease"; text: string; cap?: [string, string]; read?: number };

/* ------------------------------------------------------------- Product demo */
const ZERO_READ = [0, 0, 0, 0, 0, 0, 0, 0];

/* The read behind each MindEase line, in axis order: joy, trust, fear, surprise, sadness, disgust, anger, anticipation. */
const READS: { axes: number[]; confidence: number }[] = [
  { axes: [0.05, 0.2, 0.62, 0.1, 0.45, 0.05, 0.12, 0.35], confidence: 0.58 },
  { axes: [0.05, 0.25, 0.72, 0.12, 0.3, 0.08, 0.15, 0.6], confidence: 0.74 },
  { axes: [0.22, 0.45, 0.38, 0.1, 0.2, 0.04, 0.06, 0.4], confidence: 0.71 },
];

function script(lang: string): Turn[] {
  return [
    { who: "you", text: t("demoU1", lang) },
    { who: "mindease", text: t("demoM1", lang), cap: [t("demoC1k", lang), t("demoC1v", lang)], read: 0 },
    { who: "you", text: t("demoU2", lang) },
    { who: "mindease", text: t("demoM2", lang), cap: [t("demoC2k", lang), t("demoC2v", lang)], read: 1 },
    { who: "you", text: t("demoU3", lang) },
    { who: "mindease", text: t("demoM3", lang), cap: [t("demoC3k", lang), t("demoC3v", lang)], read: 2 },
  ];
}

/* The three promises of the first beat: icon, title key, copy key. */
const POINTS = [[PxEye, "readT", "readP"], [PxShield, "gapT", "gapP"], [PxBrain, "rememberT", "rememberP"]] as const;

/* Pacing, in ms: a beat before the first line, a breath between turns, and how long MindEase "types". */
const FIRST = 700, BETWEEN = 1600, THINK = 550, TYPE = 1350;

export default function Demo({ lang }: L) {
  const SCRIPT = useMemo(() => script(lang), [lang]);
  const total = SCRIPT.length;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [typing, setTyping] = useState(false);
  const [live, setLive] = useState(false);     // the device is on stage and in view
  const [still, setStill] = useState(false);   // prefers-reduced-motion
  const userPaused = useRef(false);
  const popped = useRef(-1);
  const host = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLDivElement>(null);

  // Reduced motion: the whole conversation is on screen at once, nothing types, the radar jumps.
  useEffect(() => { if (reducedMotion()) { setStill(true); setStep(total); setStarted(true); setPlaying(false); } }, [total]);

  // The clock: a user line lands after a breath; before a MindEase line the typing dots show for a while.
  useEffect(() => {
    if (!playing || step >= total) { setTyping(false); return; }
    if (still) { setStep(total); setPlaying(false); return; }
    const next = SCRIPT[step];
    const ids: number[] = [];
    if (next.who === "you") ids.push(window.setTimeout(() => setStep((s) => s + 1), step === 0 ? FIRST : BETWEEN));
    else {
      ids.push(window.setTimeout(() => setTyping(true), THINK));
      ids.push(window.setTimeout(() => { setTyping(false); setStep((s) => s + 1); }, THINK + TYPE));
    }
    return () => ids.forEach(clearTimeout);
  }, [playing, step, still, total, SCRIPT]);

  // Each new line pops in; the body keeps the latest turn in view.
  useEffect(() => {
    const body = host.current?.querySelector<HTMLElement>(".device-body"); if (!body) return;
    if (step - 1 !== popped.current) {
      popped.current = step - 1;
      popIn(body.querySelector(`.line[data-i="${step - 1}"]`));
      popIn(body.querySelector(`.cap[data-i="${step - 1}"]`), 140);
    }
    if (typing) popIn(body.querySelector(".typing"));
    body.scrollTo({ top: body.scrollHeight, behavior: still ? "auto" : "smooth" });
  }, [step, typing, still]);

  // On stage = the beat is faded in by the scrub (its inline opacity) and the device is at least half in view.
  useEffect(() => {
    const el = host.current; if (!el) return;
    const beat = el.closest<HTMLElement>("[data-beat]");
    const opacityOf = () => { const o = beat?.style.opacity; return o === undefined || o === "" ? 1 : parseFloat(o); };
    let visible = false, onStage = opacityOf() > 0.6;
    const sync = () => setLive(visible && onStage);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: 0.5 });
    io.observe(el);
    const mo = beat ? new MutationObserver(() => { const o = opacityOf(); const next = o > 0.6 ? true : o < 0.35 ? false : onStage; if (next !== onStage) { onStage = next; sync(); } }) : null;
    if (beat && mo) mo.observe(beat, { attributes: true, attributeFilter: ["style"] });
    return () => { io.disconnect(); mo?.disconnect(); };
  }, []);

  // Autoplay when the device arrives; pause when it leaves; resume on return unless the reader paused it.
  useEffect(() => {
    if (!live) { setPlaying(false); return; }
    if (!started) { setStarted(true); setPlaying(true); }
    else if (!still && !userPaused.current && step < total) setPlaying(true);
  }, [live, started, still, step, total]);

  // The three cards: a staggered entrance the first time the beat is on stage, a small lift on hover.
  useEffect(() => {
    const grid = cards.current; if (!grid) return;
    const items = Array.from(grid.children) as HTMLElement[];
    const unbind = items.map((el) => bindLift(el, { lift: -2, scale: 1.02 }));
    if (reducedMotion()) return () => unbind.forEach((u) => u());
    items.forEach((el) => { el.style.opacity = "0"; });
    let shown = false;
    const show = () => { if (shown) return; shown = true; items.forEach((el, i) => revealIn(el, { delay: i * 120, y: 18, duration: 900 })); };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { show(); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(grid);
    return () => { io.disconnect(); unbind.forEach((u) => u()); };
  }, []);

  const done = step >= total;
  const toggle = () => { userPaused.current = playing; setStarted(true); setPlaying(!playing); };
  const replay = () => { userPaused.current = false; setTyping(false); setStarted(true); setStep(0); setPlaying(true); };
  const jump = (i: number) => { userPaused.current = false; setTyping(false); setStarted(true); setStep(i + 1); setPlaying(!still && i + 1 < total); };

  const shownReads = SCRIPT.slice(0, step).filter((l) => l.read !== undefined);
  const current = shownReads.length ? READS[shownReads[shownReads.length - 1].read!] : null;
  const gaugeTarget = current ? current.axes : ZERO_READ;

  return (
    <Chapter id="demo" length={2.3} className="ch-demo" label={t("seeIt", lang)}>
      <div className="beat beat-line beat-intro" data-beat data-in="0" data-out="0.4">
        <div className="container demo-intro">
          <p className="eyebrow">{t("seeIt", lang)}</p>
          <h2 id="demo-title" className="display line">{t("demoTitle", lang)}</h2>
          <p className="line-cap demo-lede">{t("demoP", lang)}</p>
          <div ref={cards} className="demo-points">
            {POINTS.map(([Icon, k, p]) => (
              <div key={k} className="demo-card glass-card"><Icon className="pxicon" /><div><b>{t(k, lang)}</b><p>{t(p, lang)}</p></div></div>
            ))}
          </div>
        </div>
      </div>
      <div className="beat beat-device" data-beat data-in="0.4" data-out="1" data-fx="-4.8" data-fy="0.3" data-dim="0.85">
        <div className="container demo-stage">
          <div ref={host} className="device glass-card" role="region" aria-label={`MindEase · ${t("demoLabel", lang)}`}>
            <div className="device-head"><span className="dot" aria-hidden />MindEase <span className="muted">{t("demoLabel", lang)}</span></div>
            <div className="device-body" role="log" aria-label={t("demoLabel", lang)} aria-live="polite" tabIndex={0}>
              {SCRIPT.slice(0, step).map((l, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <div className={`line ${l.who} in`} data-i={i}>{l.text}</div>
                  {l.cap && <div className="cap in" data-i={i}><b>{l.cap[0]}</b> <span>{l.cap[1]}</span></div>}
                </div>
              ))}
              {typing && <div className="line mindease in typing" aria-hidden><i /><i /><i /></div>}
            </div>
            <div className="device-foot">
              <div className="demo-scrub" role="group" aria-label={tx("demoScrub", lang, "Jump to a turn")}>
                {SCRIPT.map((l, i) => (
                  <button
                    key={i} type="button" className={`seg${i < step ? " on" : ""}${i === step - 1 ? " cur" : ""}`}
                    aria-current={i === step - 1 ? "step" : undefined}
                    aria-label={tx("demoTurn", lang, "Turn {n} of {total}: {who}", { n: String(i + 1), total: String(total), who: l.who === "you" ? tx("demoYou", lang, "You") : "MindEase" })}
                    onClick={() => jump(i)}
                  />
                ))}
              </div>
              <div className="demo-ctls">
                {!done && (
                  <button type="button" className="ctl" onClick={toggle}>
                    {playing ? <span className="pause-glyph" aria-hidden><i /><i /></span> : <PxPlay className="pxicon" />}
                    <span>{playing ? t("pause", lang) : t("play", lang)}</span>
                  </button>
                )}
                {step > 0 && !(still && done) && <button type="button" className="ctl" onClick={replay}><PxRefresh className="pxicon" /><span>{t("replay", lang)}</span></button>}
              </div>
            </div>
          </div>
          <div className="demo-read">
            <h3>{t("demoH3", lang)}</h3>
            <DemoGauge target={gaugeTarget} lang={lang} confidence={current?.confidence ?? null} />
          </div>
        </div>
      </div>
    </Chapter>
  );
}
