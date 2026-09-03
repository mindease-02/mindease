"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Magnetic from "./home/Magnetic";
import { MOODS, type MoodId } from "@/lib/moods";
import { applyPalette, MOOD_PALETTE, paletteById } from "@/lib/theme";


export default function MoodPicker({ name }: { name: string }) {
  const router = useRouter();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(skip = false) {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/mood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(skip ? { skip: true } : { mood, note }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Couldn't save that - try again.");
      router.push("/chat");
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 880 }}>
      <div className="eyebrow" data-reveal>Before we start</div>
      <h1 className="display" data-reveal style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)", margin: "14px 0 0", ["--d" as string]: "60ms" }}>How are you arriving, {name}?</h1>
      <p className="muted" data-reveal style={{ fontWeight: 300, marginTop: 14, maxWidth: "34rem", lineHeight: 1.6, ["--d" as string]: "120ms" }}>One word is enough. It gives Ori a sense of what to hold, and you can be wrong about it.</p>
      <div className="moods" role="group" aria-label="Mood" data-reveal style={{ ["--d" as string]: "180ms" }}>
        {MOODS.map((m) => (
          <button key={m.id} type="button" className="mood" aria-pressed={mood === m.id} onClick={() => { setMood(m.id); const pal = paletteById(MOOD_PALETTE[m.id]); if (pal) applyPalette(pal); }} style={{ ["--c" as string]: m.c }}>
            <span className="dot" aria-hidden /><b>{m.label}</b><span>{m.hint}</span>
          </button>
        ))}
      </div>
      <div data-reveal style={{ marginTop: 20, ["--d" as string]: "260ms" }}>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="Anything in particular? (optional)" aria-label="Anything in particular" />
      </div>
      {error && <p style={{ color: "var(--coral-2)", marginTop: 12 }}>{error}</p>}
      <div data-reveal style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", alignItems: "center", ["--d" as string]: "320ms" }}>
        <Magnetic className={`btn-primary ${!mood || busy ? "opacity-50 pointer-events-none" : ""}`} onClick={() => go()}>{busy ? "Opening…" : "Go to the chat"} <span className="arrow">→</span></Magnetic>
        <button type="button" className="btn" disabled={busy} onClick={() => go(true)}>Skip</button>
      </div>
    </div>
  );
}
