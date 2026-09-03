"use client";
/**
 * Keystroke dynamics - aggregate timings only. Key identities are never read
 * or stored; the hook sees keydown events only as timestamps and a boolean for
 * "was this a backspace". Nothing leaves the device unless the user has turned
 * typing signals on, and even then only the ~8 numbers below.
 */
import { useCallback, useMemo, useRef } from "react";
import type { TypingFeatures } from "@/lib/affect/typing";

export function useTypingMetrics() {
  const times = useRef<number[]>([]);
  const backspaces = useRef(0);
  const typed = useRef(0);
  const firstKeyAt = useRef<number | null>(null);
  const lastKeyAt = useRef<number | null>(null);
  const promptAt = useRef<number>(Date.now());
  const longPauses = useRef(0);

  const onPromptShown = useCallback(() => { promptAt.current = Date.now(); }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const now = Date.now();
    if (e.key === "Backspace" || e.key === "Delete") backspaces.current++;
    else if (e.key.length === 1) typed.current++;
    if (firstKeyAt.current === null) firstKeyAt.current = now;
    if (lastKeyAt.current !== null && now - lastKeyAt.current > 2000) longPauses.current++;
    times.current.push(now);
    lastKeyAt.current = now;
  }, []);

  const finish = useCallback((sentLength: number): TypingFeatures | undefined => {
    const t = times.current;
    const now = Date.now();
    let out: TypingFeatures | undefined;
    if (t.length >= 12) {
      const iki: number[] = [];
      for (let i = 1; i < t.length; i++) { const d = t[i] - t[i - 1]; if (d < 2000) iki.push(d); }
      iki.sort((a, b) => a - b);
      const q = (p: number) => iki.length ? iki[Math.min(iki.length - 1, Math.floor(p * iki.length))] : 0;
      out = {
        ikiMedian: q(0.5), ikiIqr: q(0.75) - q(0.25),
        backspaceRate: backspaces.current / Math.max(1, t.length),
        latencyToFirstKeyMs: Math.max(0, (firstKeyAt.current ?? now) - promptAt.current),
        preSendPauseMs: Math.max(0, now - (lastKeyAt.current ?? now)),
        churn: Math.max(0, (typed.current - sentLength) / Math.max(1, sentLength)),
        longPauses: longPauses.current,
        length: sentLength,
      };
    }
    times.current = []; backspaces.current = 0; typed.current = 0;
    firstKeyAt.current = null; lastKeyAt.current = null; longPauses.current = 0;
    return out;
  }, []);

  // Stable identity: consumers put this in effect deps.
  return useMemo(() => ({ onKeyDown, finish, onPromptShown }), [onKeyDown, finish, onPromptShown]);
}
