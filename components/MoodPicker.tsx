"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOODS, type MoodId } from "@/lib/moods";
import { applyPalette, paletteById } from "@/lib/theme";

export default function MoodPicker({ name }: { name: string }) {
  const router = useRouter();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(pick: MoodId | null, text: string) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const body = pick ? { mood: pick, note: text } : text.trim() ? { mood: "okay", note: text, noteOnly: true } : { skip: true };
      const r = await fetch("/api/mood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Couldn't save that - try again.");
      router.push(j.needsSetup ? "/setup" : "/chat");
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 920 }}>
      <div className="eyebrow" data-reveal>Before we start</div>
      <h1 className="display" data-reveal style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)", margin: "14px 0 0", ["--d" as string]: "60ms" }}>How are you arriving, {name}?</h1>
      <p className="muted" data-reveal style={{ fontWeight: 300, marginTop: 14, maxWidth: "36rem", lineHeight: 1.6, ["--d" as string]: "120ms" }}>Tap one. It gives Ori a sense of what to hold, and you can be wrong about it.</p>
      <div className={`moods ${busy ? "busy" : ""}`} role="group" aria-label="Mood" data-reveal style={{ ["--d" as string]: "180ms" }}>
        {MOODS.map((m) => (
          <button key={m.id} type="button" className="mood" aria-pressed={mood === m.id} disabled={busy} style={{ ["--c" as string]: m.c }}
            onClick={() => { setMood(m.id); const pal = paletteById(m.id); if (pal) applyPalette(pal); go(m.id, note); }}>
            <span className="dot" aria-hidden /><b>{m.label}</b><span>{m.hint}</span>
            <small>{m.description}</small>
          </button>
        ))}
      </div>
      <form data-reveal className="note-row" style={{ ["--d" as string]: "260ms" }} onSubmit={(e) => { e.preventDefault(); go(mood, note); }}>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="Or say it in your own words…" aria-label="Say it in your own words" disabled={busy} />
        <button type="submit" className="go" aria-label="Go to the chat" disabled={busy || !note.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
      {error && <p style={{ color: "var(--coral-2)", marginTop: 12 }}>{error}</p>}
      {busy && <p className="muted" style={{ marginTop: 12, fontSize: ".9rem" }}>Opening the chat…</p>}
    </div>
  );
}
