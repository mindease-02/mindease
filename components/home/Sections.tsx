"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Reveal from "./Reveal";
import Magnetic from "./Magnetic";
import ThemeOrb from "./ThemeOrb";

/* Inline SVG icons (Lucide-style, stroke 1.5). No emoji as icons. */
const I = {
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>,
  memory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3a7 7 0 0 0-7 7c0 3 2 5 3 6v3h8v-3c1-1 3-3 3-6a7 7 0 0 0-7-7Z" /><path d="M10 21h4" /></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>,
  pause: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>,
  replay: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m5 12 4 4L19 6" /></svg>,
  minus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 12h12" /></svg>,
};

/* ------------------------------------------------------------- Product demo */
const SCRIPT: { who: "you" | "ori"; text: string; cap?: [string, string] }[] = [
  { who: "you", text: "i'm fine. just can't sleep. keep thinking about the meeting" },
  { who: "ori", text: "You've said “fine” and then described a night of not sleeping. Which half should I believe?", cap: ["Read", "masking 0.6 · anxiety 0.7 · need: reflect"] },
  { who: "you", text: "ok not fine. i think they're going to let me go" },
  { who: "ori", text: "Makes sense you're braced for it, after the way last month went. What's the actual evidence, either way?", cap: ["Move", "validate the feeling, not the conclusion · one question"] },
  { who: "you", text: "…nothing concrete. one weird look in the meeting" },
  { who: "ori", text: "One look. That's a small thing to hang a whole night on. Text me tomorrow after you've slept - I'll ask about the look, not the fear.", cap: ["Remembered", "review last month · meeting tomorrow"] },
];

export function Demo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) { setStep(SCRIPT.length); setPlaying(false); }
  }, []);
  useEffect(() => {
    if (!playing || step >= SCRIPT.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 600 : 1900);
    return () => clearTimeout(t);
  }, [playing, step]);
  // Pause when offscreen or hidden (skill: pause media when offscreen).
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setPlaying(false); });
    io.observe(el); return () => io.disconnect();
  }, []);
  const done = step >= SCRIPT.length;

  return (
    <Reveal as="section" id="demo" className="block" aria-labelledby="demo-title">
      <div className="container">
        <div className="sec-head">
          <div className="eyebrow" data-reveal>See it</div>
          <h2 id="demo-title" className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>A conversation, with the reasoning shown.</h2>
        </div>
        <div className="demo">
          <div ref={host} className="device" data-reveal role="region" aria-label="Replayed example conversation">
            <div className="device-head"><span className="dot" aria-hidden />Ori <span className="muted">· example, replayed</span></div>
            <div className="device-body" aria-live="polite">
              {SCRIPT.map((l, i) => (
                <div key={i} style={{ display: "contents" }}>
                  <div className={`line ${l.who} ${i < step ? "in" : ""}`}>{l.text}</div>
                  {l.cap && <div className={`cap ${i < step ? "in" : ""}`}><b>{l.cap[0]}:</b> {l.cap[1]}</div>}
                </div>
              ))}
            </div>
            <div className="device-foot">
              <div className="prog" aria-hidden>{SCRIPT.map((_, i) => <i key={i} className={i < step ? "on" : ""} />)}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {!done && <button className="ctl" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>{playing ? I.pause : I.play}<span>{playing ? "Pause" : "Play"}</span></button>}
                {(done || step > 0) && <button className="ctl" onClick={() => { setStep(0); setPlaying(true); }}>{I.replay}<span>Replay</span></button>}
              </div>
            </div>
          </div>
          <div className="demo-copy" data-reveal style={{ ["--d" as string]: "120ms" }}>
            <h3>Every reply has a reason you can read.</h3>
            <p>The captions under Ori's lines are the real fields the app produces on every turn. Open the Mirror in the chat and you'll see yours.</p>
            <div className="list">
              <div>{I.eye}<div><b>Read</b><p>Intensity, eight emotional axes, nuanced states, what you seem to need.</p></div></div>
              <div>{I.shield}<div><b>Check the gap</b><p>When words and tone disagree, Ori lowers its confidence and asks. It never overrides you.</p></div></div>
              <div>{I.memory}<div><b>Remember</b><p>People, plans and past — retrieved when relevant, shown to you in full.</p></div></div>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------- One feature per row */
function Wheel() {
  // Static 8-axis shape: today (bright) over the last few days (soft).
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

export function FeatureRows() {
  return (
    <Reveal as="section" id="features" className="block" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="sec-head" style={{ marginBottom: 24 }}>
          <div className="eyebrow" data-reveal>What it does</div>
          <h2 className="display" data-reveal style={{ ["--d" as string]: "80ms" }}>Three things, done properly.</h2>
        </div>

        <div className="feat" data-reveal>
          <div>
            <div className="icon">{I.eye}</div>
            <h3 className="display">Reads more than words</h3>
            <p>Eight emotional axes and states like loneliness, dread or relief — from what you write, and, if you allow it, how you sound and how you type. Each channel weighed by how sure it is.</p>
            <ul><li>Personal baselines, never population norms</li><li>Trend, not level — alarms on change</li><li>Every signal is opt-in and visible</li></ul>
          </div>
          <div className="feat-visual" aria-hidden><Wheel /></div>
        </div>

        <div className="feat flip" data-reveal>
          <div>
            <div className="icon">{I.memory}</div>
            <h3 className="display">Remembers you</h3>
            <p>Names, plans, the story so far. Short facts you can see and delete — so a reply says “Maya”, not “a friend”, and next week it asks how the interview went.</p>
            <ul><li>Retrieved when relevant, not recited</li><li>Reminiscence: it asks about your past, gently</li><li>Yours to forget, one tap</li></ul>
          </div>
          <div className="feat-visual" aria-hidden>
            <div className="chips">
              {[["person", "Sister Maya — fell out in March, hasn't called"], ["past", "Grew up by the sea; misses it in winter"], ["goal", "Wants the promotion, scared of the interview"], ["routine", "Usually up past midnight on work nights"]].map(([k, t]) => (
                <div className="chip-mem" key={t}><span className="k">{k}</span>{t}<span className="x">forget</span></div>
              ))}
            </div>
          </div>
        </div>

        <div className="feat" data-reveal>
          <div>
            <div className="icon">{I.bell}</div>
            <h3 className="display">Checks in, carefully</h3>
            <p>Mornings, isolated evenings, long silences, and real downward trends. Four detectors watch the multi-day pattern; two must agree. Quiet hours, a daily cap, and it stops if you go quiet on it.</p>
            <ul><li>Every check-in says what prompted it</li><li>“Not useful” makes it rarer</li><li>The more you lean on it, the less it initiates</li></ul>
          </div>
          <div className="feat-visual" aria-hidden>
            <div className="line ori in" style={{ maxWidth: "100%", opacity: 1, transform: "none", padding: "12px 14px", borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--color-border)", fontSize: ".9rem" }}>
              <span style={{ display: "block", fontSize: ".62rem", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: 4 }}>unprompted · because your evenings have been shorter</span>
              Your messages have been getting shorter in the evenings this week. Am I reading that right?
            </div>
            <div className="gates">
              {[["ok", "Two of four detectors agree", "trend 0.68"], ["ok", "Outside quiet hours", "22:30 → 08:00"], ["ok", "Budget", "1 of 2 today"], ["no", "Reliance not climbing", "waiting"]].map(([s, t, v]) => (
                <div className={`gate ${s}`} key={t}>{s === "ok" ? I.check : I.minus}<b>{t}</b><span>{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------- Story */
export function Story() {
  return (
    <Reveal as="section" id="story" className="block">
      <div className="container story">
        <div>
          <div className="eyebrow" data-reveal>Why it exists</div>
          <blockquote className="display" data-reveal style={{ ["--d" as string]: "80ms", marginTop: 16 }}>
            A companion that is <em>always there</em> can quietly become the only one there. We built the opposite.
          </blockquote>
          <p className="body" data-reveal style={{ ["--d" as string]: "200ms", marginTop: 24 }}>
            Ori measures how much you lean on it. When that climbs, it gets shorter, says so, and points you back toward people. It is software and never pretends otherwise. Success is this mattering less over time.
          </p>
        </div>
        <ThemeOrb />
      </div>
    </Reveal>
  );
}

/* --------------------------------------------------------------------- CTA */
export function Cta({ chatHref }: { chatHref: string }) {
  return (
    <Reveal as="section" id="start" className="block">
      <div className="container">
        <div className="cta" data-reveal>
          <div className="light" /><div className="planet" />
          <h2 className="display">Tell it how you're arriving.</h2>
          <p>Pick a mood, say a line if you want, and Ori meets you there. No account, no password — a name is enough.</p>
          <div className="ctas">
            <Magnetic href={chatHref} className="btn-primary">Start talking <span className="arrow" aria-hidden>→</span></Magnetic>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ Footer */
export function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="foot">
          <div>
            <div className="display" style={{ fontSize: "1.6rem" }}>MindEase</div>
            <p className="muted" style={{ maxWidth: "24rem", fontWeight: 300, lineHeight: 1.6, marginTop: 10 }}>Ori is software, and says so. If you're in crisis, call a helpline — the app shows real Indian lines automatically, and never invents a number.</p>
          </div>
          <div><h5>Product</h5><a href="#demo">See it</a><a href="#features">What it does</a><a href="#story">Why</a><a href="#start">Start</a></div>
          <div><h5>Crisis lines · India</h5><a href="https://telemanas.mohfw.gov.in" target="_blank" rel="noreferrer">Tele-MANAS · 14416</a><a href="tel:18005990019">Kiran · 1800-599-0019</a><a href="https://www.vandrevalafoundation.com" target="_blank" rel="noreferrer">Vandrevala · +91 9999 666 555</a><a href="tel:112">Emergency · 112</a></div>
          <div><h5>Source</h5><a href="https://github.com/mindease-02/mindease" target="_blank" rel="noreferrer">GitHub</a><Link href="/login">Sign in</Link></div>
        </div>
        <div className="foot-bottom"><span>© {new Date().getFullYear()} MindEase</span><span>Not therapy · Not a person · Not private from you</span></div>
      </div>
    </footer>
  );
}
