"use client";
/**
 * Grounding techniques, opened automatically when someone arrives angry and
 * available to anyone from the header. Guided box breathing with an animated
 * ring, the physiological sigh, 5-4-3-2-1 grounding, and "move it" for anger.
 * Nothing here is clinical advice; it's the stuff that works in the next five
 * minutes.
 */
import { useEffect, useState } from "react";

type Kind = "box" | "sigh" | "ground" | "move";
const PHASES = { box: [["Breathe in", 4], ["Hold", 4], ["Breathe out", 4], ["Hold", 4]] as [string, number][], sigh: [["Breathe in", 2], ["Sip in more", 1], ["Long breath out", 6], ["Rest", 2]] as [string, number][] };

export default function Techniques({ mood, onClose, initial }: { mood: string | null; onClose: () => void; initial?: Kind }) {
  const [kind, setKind] = useState<Kind>(initial ?? (mood === "anxious" ? "sigh" : "box"));
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(0);
  const [round, setRound] = useState(0);
  const phases = kind === "sigh" ? PHASES.sigh : PHASES.box;

  useEffect(() => {
    if (!running) return;
    setLeft(phases[phase][1]);
    const t = setInterval(() => setLeft((l) => {
      if (l > 1) return l - 1;
      setPhase((p) => { const n = (p + 1) % phases.length; if (n === 0) setRound((r) => r + 1); return n; });
      return 0;
    }), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, kind]);

  const label = phases[phase][0];
  const scale = !running ? 0.7 : label.includes("in") || label.includes("Sip") ? 1 : label.includes("out") ? 0.62 : undefined;

  return (
    <div className="techniques" role="region" aria-label="Techniques">
      <div className="t-head">
        <div>
          <div className="eyebrow">{mood === "angry" ? "Bringing the heat down" : mood === "anxious" ? "Settling" : "Techniques"}</div>
          <p className="muted t-sub">{mood === "angry" ? "Anger's a full-body thing. Two minutes of this and the next sentence comes out different." : "Pick one. None of them need you to feel like it."}</p>
        </div>
        <button className="clay-btn px-3 py-1.5 text-xs" onClick={onClose} aria-label="close techniques">✕</button>
      </div>
      <div className="t-tabs">
        {([["box", "Box breathing"], ["sigh", "Physiological sigh"], ["ground", "5-4-3-2-1"], ["move", "Move it"]] as [Kind, string][]).map(([k, l]) => (
          <button key={k} className={`t-tab ${kind === k ? "on" : ""}`} onClick={() => { setKind(k); setRunning(false); setPhase(0); setRound(0); }}>{l}</button>
        ))}
      </div>

      {(kind === "box" || kind === "sigh") && (
        <div className="t-breathe">
          <div className="t-ring" style={{ transform: `scale(${scale ?? 1})`, transitionDuration: running ? `${phases[phase][1]}s` : ".6s" }}>
            <span>{running ? label : "Ready"}</span>
            {running && <small>{left}</small>}
          </div>
          <div className="t-controls">
            <button className="clay-btn-primary px-4 py-2 text-sm" onClick={() => { setRunning((r) => !r); setPhase(0); }}>{running ? "Stop" : "Start"}</button>
            <span className="muted t-round">{running ? `round ${round + 1} · ${kind === "box" ? "4 in · 4 hold · 4 out · 4 hold" : "two sips in, long slow out"}` : kind === "box" ? "Four rounds is enough to notice." : "Two or three is enough — it's the fastest way to calm a body down."}</span>
          </div>
        </div>
      )}

      {kind === "ground" && (
        <ol className="t-list">
          {[["5", "things you can see. Name them, slowly."], ["4", "things you can touch. Actually touch them."], ["3", "things you can hear, near and far."], ["2", "things you can smell — or two you like."], ["1", "thing you can taste, or one slow breath."]].map(([n, t]) => (
            <li key={n}><b>{n}</b><span>{t}</span></li>
          ))}
        </ol>
      )}

      {kind === "move" && (
        <ol className="t-list">
          {[["1", "Stand up. Shake out your hands and arms for twenty seconds — hard."], ["2", "Cold water on your wrists and the back of your neck, or a splash on the face."], ["3", "Walk. Out of the room, ideally out of the door. Ten minutes, no phone."], ["4", "Say the sentence you want to say — out loud, to no one — before you say it to them."]].map(([n, t]) => (
            <li key={n}><b>{n}</b><span>{t}</span></li>
          ))}
        </ol>
      )}
    </div>
  );
}
