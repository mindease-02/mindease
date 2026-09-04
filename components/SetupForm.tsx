"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Magnetic from "./home/Magnetic";

/** One-time setup between mood and chat: the few switches that matter. Skippable; editable later in the Mirror. */
export default function SetupForm({ name, tz }: { name: string; tz: string }) {
  const router = useRouter();
  const [checkins, setCheckins] = useState(true);
  const [morning, setMorning] = useState(true);
  const [evening, setEvening] = useState(true);
  const [silence, setSilence] = useState(true);
  const [quietFrom, setQuietFrom] = useState(22.5);
  const [quietTo, setQuietTo] = useState(8);
  const [voice, setVoice] = useState(false);
  const [typing, setTyping] = useState(false);
  const [region, setRegion] = useState("IN");
  const [busy, setBusy] = useState(false);

  async function finish(skip = false) {
    setBusy(true);
    try {
      const body = skip ? { setupDone: true } : {
        setupDone: true, region,
        consent: { enabled: checkins, cadence: { morning, evening, inactivityHours: silence ? 36 : 0 }, quietFrom, quietTo, voiceSignals: voice, typingSignals: typing, allowBehaviouralSignals: voice || typing },
      };
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      router.push("/chat");
    } finally { setBusy(false); }
  }

  const Row = ({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label className="check" style={{ marginTop: 10 }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span><b>{label}</b>{hint && <span>{hint}</span>}</span>
    </label>
  );
  const fmt = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="steps-ind" data-reveal aria-label="Step 3 of 3"><i className="on" /><i className="on" /><i className="on" /><span>Step 3 of 3 · how Ori should behave, {name}</span></div>
      <h1 className="display" data-reveal style={{ fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)", margin: "14px 0 0", ["--d" as string]: "60ms" }}>How should Ori behave?</h1>
      <p className="muted" data-reveal style={{ fontWeight: 300, marginTop: 14, maxWidth: "36rem", lineHeight: 1.6, ["--d" as string]: "120ms" }}>Thirty seconds, once. Everything here can be changed later in the Mirror.</p>

      <div className="glass" data-reveal style={{ padding: 22, marginTop: 26, ["--d" as string]: "180ms" }}>
        <div className="eyebrow">Check-ins</div>
        <Row label="Let Ori write to me first" hint="Only when something it noticed is worth it. At most twice a day, and it stops if you don't answer." value={checkins} onChange={setCheckins} />
        {checkins && (
          <div style={{ paddingLeft: 12 }}>
            <Row label="A short morning hello" value={morning} onChange={setMorning} />
            <Row label="An evening check when the day looked isolated" value={evening} onChange={setEvening} />
            <Row label="A nudge after a long silence" value={silence} onChange={setSilence} />
          </div>
        )}
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <span className="muted" style={{ fontSize: ".9rem" }}>Quiet hours ({tz}) <b style={{ color: "var(--ink)" }}>{fmt(quietFrom)} → {fmt(quietTo)}</b></span>
          <input type="range" min={18} max={26} step={0.5} value={quietFrom > 12 ? quietFrom : quietFrom + 24} onChange={(e) => setQuietFrom(Number(e.target.value) % 24)} aria-label="Quiet from" />
          <input type="range" min={5} max={11} step={0.5} value={quietTo} onChange={(e) => setQuietTo(Number(e.target.value))} aria-label="Quiet until" />
        </div>
      </div>

      <div className="glass" data-reveal style={{ padding: 22, marginTop: 14, ["--d" as string]: "240ms" }}>
        <div className="eyebrow">What Ori may read</div>
        <p className="muted" style={{ fontSize: ".85rem", marginTop: 6, fontWeight: 300 }}>Words are always read. These are optional, and nothing raw leaves your device.</p>
        <Row label="Tone of voice" hint="When you use the mic: pitch, pace, pauses - ten numbers, no audio kept." value={voice} onChange={setVoice} />
        <Row label="Typing rhythm" hint="Speed, hesitation, rewriting. Never which keys." value={typing} onChange={setTyping} />
      </div>

      <div className="glass" data-reveal style={{ padding: 22, marginTop: 14, ["--d" as string]: "300ms" }}>
        <div className="eyebrow">Crisis lines for</div>
        <select className="field" style={{ marginTop: 10 }} value={region} onChange={(e) => setRegion(e.target.value)}>
          {[["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"], ["AU", "Australia"], ["CA", "Canada"], ["IE", "Ireland"], ["NZ", "New Zealand"], ["DE", "Germany"], ["FR", "France"], ["ZA", "South Africa"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div data-reveal style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", alignItems: "center", ["--d" as string]: "360ms" }}>
        <Magnetic className={`btn-primary ${busy ? "opacity-50 pointer-events-none" : ""}`} onClick={() => finish()}>{busy ? "Opening…" : "Start chatting"} <span className="arrow">→</span></Magnetic>
        <button type="button" className="btn" disabled={busy} onClick={() => finish(true)}>Use the defaults</button>
      </div>
    </div>
  );
}
