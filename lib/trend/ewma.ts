/**
 * Dual-rate exponentially weighted moving averages over the valence series.
 *
 * One EWMA tells you where someone is. Two, at different time constants, tell you
 * which way they are moving - the fast trace leads the slow one on the way down
 * and crosses back above it on the way up. That crossing is a much better trigger
 * than a threshold on the level, because level thresholds fire constantly for
 * people whose baseline is simply low, and never fire for people who are
 * deteriorating from a high baseline. The second case is the one that matters.
 *
 * Time-decayed rather than sample-indexed: three messages an hour apart and three
 * messages a minute apart are not the same amount of evidence, and someone who
 * goes quiet for two days should not have their state frozen at whatever they last
 * happened to say.
 */

export interface EwmaState {
  fast: number;
  slow: number;
  /** Effective sample count, also decayed. Used to gate acting on the trace. */
  weight: number;
  lastAt: number;
  initialized: boolean;
}

export const FAST_HALFLIFE_MS = 6 * 60 * 60 * 1000;   // ~6h: within-day swing
export const SLOW_HALFLIFE_MS = 5 * 24 * 60 * 60 * 1000; // ~5d: the person's current normal

export function emptyEwma(): EwmaState {
  return { fast: 0, slow: 0, weight: 0, lastAt: 0, initialized: false };
}

function decay(dtMs: number, halfLife: number): number {
  return Math.pow(0.5, Math.max(0, dtMs) / halfLife);
}

/**
 * @param confidence 0..1 from the affect snapshot. A low-confidence reading moves
 *   the trace proportionally less - it is evidence, just weak evidence.
 */
export function updateEwma(s: EwmaState, value: number, at: number, confidence = 1): EwmaState {
  if (!s.initialized) {
    return { fast: value, slow: value, weight: confidence, lastAt: at, initialized: true };
  }
  const dt = at - s.lastAt;
  const af = decay(dt, FAST_HALFLIFE_MS);
  const as = decay(dt, SLOW_HALFLIFE_MS);
  const k = Math.max(0, Math.min(1, confidence));

  return {
    fast: s.fast * af * (1 - k) + value * (1 - af * (1 - k)),
    slow: s.slow * as * (1 - k * 0.5) + value * (1 - as * (1 - k * 0.5)),
    weight: s.weight * as + k,
    lastAt: at,
    initialized: true,
  };
}

/** Decay the trace forward to `now` without adding an observation. */
export function ageEwma(s: EwmaState, now: number): EwmaState {
  if (!s.initialized) return s;
  const dt = now - s.lastAt;
  // Values relax toward 0 (unknown), not toward their last value: absence of
  // contact is absence of evidence, and should widen uncertainty over time.
  return {
    fast: s.fast * decay(dt, FAST_HALFLIFE_MS),
    slow: s.slow * decay(dt, SLOW_HALFLIFE_MS),
    weight: s.weight * decay(dt, SLOW_HALFLIFE_MS),
    lastAt: now,
    initialized: true,
  };
}

/** Negative = fast trace below slow trace = currently trending down. */
export function momentum(s: EwmaState): number {
  return s.initialized ? s.fast - s.slow : 0;
}
