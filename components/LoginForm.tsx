"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [proactive, setProactive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const region = (navigator.language.split("-")[1] ?? "").toUpperCase() || undefined;
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, timeZone, region, proactive }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "couldn't sign in");
      router.push("/chat");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="clay w-full max-w-md p-7 sm:p-8">
      <label className="block text-sm text-clay-muted" htmlFor="who">What should Ori call you?</label>
      <input id="who" className="clay-input mt-2" placeholder="a name, an email, anything" autoFocus
        value={identifier} onChange={(e) => setIdentifier(e.target.value)} maxLength={120} autoComplete="off" />
      <p className="mt-2 text-xs text-clay-muted">No password. Whatever you type here is your key - use the same thing next time to pick up where you left off.</p>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[20px] bg-clay-bg-deep p-4 shadow-clay-in">
        <input type="checkbox" className="mt-1 accent-clay-coral" checked={proactive} onChange={(e) => setProactive(e.target.checked)} />
        <span className="text-sm">
          <span className="font-medium">Let Ori check in on me unprompted.</span>
          <span className="mt-1 block text-xs leading-relaxed text-clay-muted">
            Mornings, isolated evenings, long silences, and real downward trends. Never in your quiet hours (22:30-08:00 by default), at most twice a day, and it stops if you don't answer. Every check-in says what prompted it. You can change all of this later.
          </span>
        </span>
      </label>

      {error && <p className="mt-4 text-sm text-clay-coral">{error}</p>}
      <button className="clay-btn-primary mt-6 w-full" disabled={busy || !identifier.trim()}>{busy ? "Opening…" : "Continue"}</button>
      <p className="mt-4 text-center text-[11px] leading-relaxed text-clay-muted">
        Ori is software, not a therapist. If you're in crisis, use a helpline - the app shows them automatically.
      </p>
    </form>
  );
}
