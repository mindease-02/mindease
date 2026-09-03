/**
 * Eight-axis emotion tracking.
 *
 * VAD (three axes) is what the trend engine keys off, because it is continuous
 * and well-behaved. But three numbers give the companion a thin emotional
 * vocabulary: "low valence, low arousal" could be grief, boredom, fatigue or
 * peace. The eight axes here are Plutchik's primary emotions, which come in four
 * opposing pairs and so can be reasoned about as a wheel:
 *
 *   joy <-> sadness, trust <-> disgust, fear <-> anger, surprise <-> anticipation
 *
 * Each axis is 0..1 intensity. Adjacent pairs blend into named dyads (joy +
 * trust = love, fear + surprise = awe, sadness + disgust = remorse, anger +
 * anticipation = aggressiveness, ...), which the prompt can name when useful.
 *
 * Two sources feed it: the fast LLM analysis (primary) and a projection from the
 * lexical VAD reading (fallback, always available). The state is time-decayed
 * like the EWMA so a bad hour does not colour the whole week.
 */
import type { VAD } from "./types";

export const OCTANT_AXES = [
  "joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation",
] as const;
export type OctantAxis = (typeof OCTANT_AXES)[number];
export type Octant = Record<OctantAxis, number>;

export interface OctantState {
  /** Slow trace: the person's current emotional climate. */
  climate: Octant;
  /** Fast trace: this session's weather. */
  weather: Octant;
  lastAt: number;
  initialized: boolean;
}

const FAST_HALFLIFE_MS = 4 * 3600_000;
const SLOW_HALFLIFE_MS = 4 * 86_400_000;

export function zeroOctant(): Octant {
  return { joy: 0, trust: 0, fear: 0, surprise: 0, sadness: 0, disgust: 0, anger: 0, anticipation: 0 };
}

export function emptyOctant(): OctantState {
  return { climate: zeroOctant(), weather: zeroOctant(), lastAt: 0, initialized: false };
}

export function clampOctant(o: Partial<Record<string, unknown>>): Octant {
  const out = zeroOctant();
  for (const k of OCTANT_AXES) {
    const v = Number(o?.[k]);
    out[k] = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  }
  return out;
}

/**
 * Fallback projection from VAD. Deliberately soft - it exists so the eight-axis
 * view is never empty, not because VAD determines it.
 */
export function octantFromVAD(vad: VAD): Octant {
  const { valence: v, arousal: a, dominance: d } = vad;
  const pos = Math.max(0, v), neg = Math.max(0, -v);
  const hi = Math.max(0, a), lo = Math.max(0, -a);
  const ctl = Math.max(0, d), help = Math.max(0, -d);
  return clampOctant({
    joy: pos * (0.6 + 0.4 * hi),
    trust: pos * (0.5 + 0.5 * lo) * 0.8,
    fear: neg * hi * (0.5 + 0.5 * help),
    surprise: hi * 0.35,
    sadness: neg * (0.55 + 0.45 * lo),
    disgust: neg * 0.35 * ctl,
    anger: neg * hi * (0.4 + 0.6 * ctl),
    anticipation: pos * hi * 0.6 + ctl * 0.2,
  });
}

function decay(dt: number, hl: number) { return Math.pow(0.5, Math.max(0, dt) / hl); }

export function updateOctant(s: OctantState, o: Octant, at: number, confidence = 1): OctantState {
  const k = Math.max(0.05, Math.min(1, confidence));
  if (!s.initialized) return { climate: { ...o }, weather: { ...o }, lastAt: at, initialized: true };
  const af = decay(at - s.lastAt, FAST_HALFLIFE_MS);
  const as = decay(at - s.lastAt, SLOW_HALFLIFE_MS);
  const climate = zeroOctant(), weather = zeroOctant();
  for (const ax of OCTANT_AXES) {
    weather[ax] = s.weather[ax] * af * (1 - k) + o[ax] * (1 - af * (1 - k));
    climate[ax] = s.climate[ax] * as * (1 - k * 0.5) + o[ax] * (1 - as * (1 - k * 0.5));
  }
  return { climate, weather, lastAt: at, initialized: true };
}

/** Plutchik's primary dyads - named blends of adjacent axes. */
const DYADS: [OctantAxis, OctantAxis, string][] = [
  ["joy", "trust", "love"], ["trust", "fear", "submission"], ["fear", "surprise", "awe"],
  ["surprise", "sadness", "disapproval"], ["sadness", "disgust", "remorse"],
  ["disgust", "anger", "contempt"], ["anger", "anticipation", "aggressiveness"],
  ["anticipation", "joy", "optimism"],
  // secondary dyads that matter for this application
  ["joy", "fear", "guilt"], ["sadness", "anger", "envy"], ["trust", "sadness", "sentimentality"],
  ["anticipation", "fear", "anxiety"], ["sadness", "anticipation", "pessimism"],
];

export interface OctantSummary {
  dominant: { axis: OctantAxis; value: number }[];
  dyad: string | null;
  /** Free-text, e.g. "sadness with some anticipation - pessimism leaning". */
  description: string;
}

export function summarizeOctant(o: Octant): OctantSummary {
  const ranked = OCTANT_AXES.map((axis) => ({ axis, value: o[axis] })).sort((a, b) => b.value - a.value);
  const dominant = ranked.filter((r) => r.value > 0.18).slice(0, 3);
  let dyad: string | null = null;
  if (dominant.length >= 2 && dominant[1].value > 0.25) {
    const [a, b] = [dominant[0].axis, dominant[1].axis];
    const hit = DYADS.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
    dyad = hit ? hit[2] : null;
  }
  const description = dominant.length === 0
    ? "quiet - nothing pronounced"
    : dominant.map((d) => `${d.axis} ${(d.value * 100).toFixed(0)}%`).join(", ") + (dyad ? ` - reads as ${dyad}` : "");
  return { dominant, dyad, description };
}

/** Which axes moved most between the climate and the weather. */
export function octantShift(s: OctantState): { axis: OctantAxis; delta: number }[] {
  if (!s.initialized) return [];
  return OCTANT_AXES
    .map((axis) => ({ axis, delta: s.weather[axis] - s.climate[axis] }))
    .filter((d) => Math.abs(d.delta) > 0.15)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}
