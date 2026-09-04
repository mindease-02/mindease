"use client";
import { useEffect, useRef, useState } from "react";
import { bindLift } from "@/lib/motion";
import { useRouter } from "next/navigation";
import { MOODS, type MoodId } from "@/lib/moods";
import { applyPalette, paletteById } from "@/lib/theme";
import { PxArrow } from "./home/pixelIcons";

export default function MoodPicker({ name }: { name: string }) {
  const router = useRouter();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  // Ghost-click guard: a tap that navigated here from the previous page can deliver
  // its synthesised click to whatever now sits under the finger. Ignore the first beat.
  const mountedAt = useRef(0);
  useEffect(() => { mountedAt.current = performance.now(); }, []);
  const armed = () => performance.now() - mountedAt.current > 700;
  useEffect(() => { const un = Array.from(grid.current?.querySelectorAll<HTMLElement>(".mood") ?? []).map((el) => bindLift(el, { lift: -6, scale: 1.02 })); return () => un.forEach((u) => u()); }, []);

  async function go(pick: MoodId | null, text: string) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const body = pick ? { mood: pick, note: text } : text.trim() ? { mood: "okay", note: text, noteOnly: true } : { skip: true };
      const r = await fetch("/api/mood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Couldn't save that - try again.");
      router.push("/chat");
    } catch (err) {
      setError((err as Error).message); setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 920 }}>
      <div className="steps-ind" data-reveal aria-label="Step 2 of 2"><i className="on" /><i className="on" /><span>Step 2 of 2 · how you're arriving</span></div>
      <h1 className="display" data-reveal style={{ fontSize: "clamp(2.6rem, 6vw, 4.8rem)", margin: "14px 0 0", ["--d" as string]: "60ms" }}>How are you arriving, {name}?</h1>
      <p className="muted" data-reveal style={{ fontWeight: 300, marginTop: 14, maxWidth: "36rem", lineHeight: 1.6, ["--d" as string]: "120ms" }}>Tap one. It gives Ori a sense of what to hold, and you can be wrong about it.</p>
      <div ref={grid} className={`moods ${busy ? "busy" : ""}`} role="group" aria-label="Mood" data-stagger>
        {MOODS.map((m) => (
          <button key={m.id} type="button" className="mood" aria-pressed={mood === m.id} disabled={busy} style={{ ["--c" as string]: m.c }}
            onClick={() => { if (!armed()) return; setMood(m.id); const pal = paletteById(m.id); if (pal) applyPalette(pal); go(m.id, note); }}>
            <span className="dot" aria-hidden /><b>{m.label}</b><span>{m.hint}</span>
            <small>{m.description}</small>
          </button>
        ))}
      </div>
      <form data-reveal className="note-row" style={{ ["--d" as string]: "260ms" }} onSubmit={(e) => { e.preventDefault(); if (armed()) go(mood, note); }}>
        <label htmlFor="own-words" className="label">Or say it in your own words</label>
        <input id="own-words" className="field" value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="e.g. exam on Monday and I can’t focus" disabled={busy} />
        <button type="submit" className="go" aria-label="Go to the chat" disabled={busy || !note.trim()}>
          <PxArrow className="pxicon" style={{ fontSize: 22 }} />
        </button>
      </form>
      {error && <p style={{ color: "var(--coral-2)", marginTop: 12 }}>{error}</p>}
      {busy && <p className="muted" style={{ marginTop: 12, fontSize: ".9rem" }}>Opening the chat…</p>}
    </div>
  );
}
