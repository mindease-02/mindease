/**
 * Mann-Kendall trend test with tie correction, plus the Theil-Sen slope estimate.
 *
 * Why a nonparametric test rather than fitting a line: mood series from a chat app
 * are short, irregularly spaced, non-Gaussian and full of outliers (one bad hour
 * inside a fine week). Mann-Kendall only looks at the sign of every pairwise
 * comparison, so a single catastrophic afternoon cannot manufacture a downward
 * "trend", and Theil-Sen gives a slope with a ~29% breakdown point instead of OLS's
 * zero.
 *
 * This is the statistical core of the promise that check-ins are triggered by an
 * inferred trend and not by a clock. The system asks "is there evidence of
 * monotone decline in this person's valence series, at p < alpha, with an effect
 * size worth acting on" - and if the answer is no, it stays quiet, however long it
 * has been since it last said anything.
 */
import { median, normalCdf } from "../util/stats";

export interface TrendTest {
  /** Mann-Kendall S statistic. Negative = downward. */
  s: number;
  /** Kendall's tau in [-1, 1]. Effect size, comparable across series lengths. */
  tau: number;
  /** Two-sided p-value from the normal approximation. */
  p: number;
  z: number;
  /** Theil-Sen slope, in valence units per day. */
  slopePerDay: number;
  n: number;
  direction: "down" | "up" | "flat";
}

export const NO_TREND: TrendTest = {
  s: 0, tau: 0, p: 1, z: 0, slopePerDay: 0, n: 0, direction: "flat",
};

/** Fewer than this and the test has no power worth speaking of. */
export const MIN_POINTS = 7;

export function mannKendall(times: number[], values: number[]): TrendTest {
  const n = Math.min(times.length, values.length);
  if (n < MIN_POINTS) return { ...NO_TREND, n };

  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      s += Math.sign(values[j] - values[i]);
    }
  }

  // Variance with correction for tied values (common here - lots of near-neutral turns).
  const counts = new Map<number, number>();
  for (const v of values.slice(0, n)) {
    const key = Math.round(v * 100); // tie at 2dp
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let tieTerm = 0;
  for (const c of counts.values()) if (c > 1) tieTerm += c * (c - 1) * (2 * c + 5);
  const varS = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;

  const z = varS <= 0 ? 0 : s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const tau = (2 * s) / (n * (n - 1));

  // Theil-Sen: median of all pairwise slopes.
  const DAY = 86_400_000;
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dt = (times[j] - times[i]) / DAY;
      if (dt > 1e-6) slopes.push((values[j] - values[i]) / dt);
    }
  }

  return {
    s,
    tau,
    p,
    z,
    slopePerDay: slopes.length ? median(slopes) : 0,
    n,
    direction: p < 0.1 ? (s < 0 ? "down" : "up") : "flat",
  };
}
