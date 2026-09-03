/** Small statistics helpers. No dependencies - these run on the edge and in tests. */

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** Median absolute deviation, scaled to be a consistent estimator of sigma. */
export function mad(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = median(xs);
  return 1.4826 * median(xs.map((x) => Math.abs(x - m)));
}

export const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));

/** Squash an unbounded z-score into [-1, 1] with a gentle knee around |z| = 1.5. */
export const squashZ = (z: number, k = 0.65) => Math.tanh(z * k);

/**
 * A running per-user baseline. Behavioural signals (pitch, typing speed) are only
 * interpretable relative to that person's own norm - absolute values mostly encode
 * who they are, not how they are. Robust (median/MAD) so a couple of odd sessions
 * do not permanently skew the reference.
 */
export interface Baseline {
  samples: number[];
  center: number;
  spread: number;
  n: number;
}

export const MAX_BASELINE_SAMPLES = 120;

export function emptyBaseline(): Baseline {
  return { samples: [], center: 0, spread: 0, n: 0 };
}

export function updateBaseline(b: Baseline, x: number): Baseline {
  if (!Number.isFinite(x)) return b;
  const samples = [...b.samples, x].slice(-MAX_BASELINE_SAMPLES);
  return { samples, center: median(samples), spread: mad(samples), n: b.n + 1 };
}

/**
 * z-score against the personal baseline. Returns null until the baseline is
 * established - guessing from three samples produces confident nonsense, and this
 * system acts on these numbers.
 */
export function zScore(b: Baseline, x: number, minN = 8): number | null {
  if (b.n < minN || !Number.isFinite(x)) return null;
  const spread = b.spread > 1e-9 ? b.spread : stdev(b.samples);
  if (spread < 1e-9) return null;
  return (x - b.center) / spread;
}

/** Linear least-squares slope of y on x. */
export function slope(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den < 1e-12 ? 0 : num / den;
}

/** Normal CDF via Abramowitz & Stegun 7.1.26. Used for trend-test p-values. */
export function normalCdf(z: number): number {
  const s = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + s * y);
}
