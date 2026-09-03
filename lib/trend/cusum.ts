/**
 * One-sided CUSUM change-point detector.
 *
 * Mann-Kendall answers "has this been sliding for a while". CUSUM answers a
 * different and more urgent question: "did something change recently". A person
 * who was steady for three weeks and dropped hard on Tuesday has no significant
 * monotone trend - the long flat stretch swamps it - but they have an obvious
 * change point, and that is often the more actionable event.
 *
 * The two run in parallel and either can raise the trigger score. Slow slide and
 * sudden drop are both real, and a system that only detects one of them will miss
 * half the people it exists for.
 *
 * Standard tabular CUSUM: accumulate (reference - observation - slack), floor at
 * zero, alarm when the accumulation exceeds the decision interval h. Slack k is
 * half the shift size we care about, which is the classic choice that gives fastest
 * detection of that shift.
 */

export interface CusumState {
  /** Accumulated evidence for a downward shift. Non-negative. */
  low: number;
  /** Reference level the shift is measured against - the person's own recent normal. */
  reference: number;
  /** Index/time at which the current accumulation started rising from zero. */
  shiftStartedAt: number | null;
  alarm: boolean;
  peak: number;
}

/** Detect a sustained drop of ~0.5 valence units. k = shift/2. */
export const DEFAULT_K = 0.25;
/** Decision interval, in units of the series' own scale. ~5 sigma of accumulated drift. */
export const DEFAULT_H = 1.6;

export function emptyCusum(reference = 0): CusumState {
  return { low: 0, reference, shiftStartedAt: null, alarm: false, peak: 0 };
}

export function updateCusum(
  s: CusumState,
  value: number,
  at: number,
  k = DEFAULT_K,
  h = DEFAULT_H,
): CusumState {
  const contribution = s.reference - value - k;
  const low = Math.max(0, s.low + contribution);

  return {
    low,
    reference: s.reference,
    // Remember when the current excursion began, so we can tell the user *when*
    // rather than only *that*. "Since about Thursday" is usable; "alarm" is not.
    shiftStartedAt: low > 0 ? (s.low === 0 ? at : s.shiftStartedAt) : null,
    alarm: low > h,
    peak: Math.max(s.peak * 0.98, low), // slow decay so the peak reflects this episode
  };
}

/**
 * Recompute the reference from a stable historical window. Called when the series
 * has been quiet and level for a while, so the detector re-baselines to who the
 * person is now instead of endlessly alarming against a happier past self. That
 * re-baselining is a deliberate anti-pathologising choice: a persistently low but
 * stable mood is a state to respect, not an anomaly to keep flagging.
 */
export function rebaseline(s: CusumState, values: number[]): CusumState {
  if (values.length < 10) return s;
  const sorted = [...values].sort((a, b) => a - b);
  // Trimmed mean of the middle 60%, so the excursion we just detected does not
  // become the new normal by itself.
  const lo = Math.floor(sorted.length * 0.2);
  const hi = Math.ceil(sorted.length * 0.8);
  const mid = sorted.slice(lo, hi);
  const reference = mid.reduce((a, b) => a + b, 0) / mid.length;
  return { ...emptyCusum(reference) };
}
