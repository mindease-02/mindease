/**
 * Which kind of check-in helps THIS person - learned online.
 *
 * Thompson sampling over a Beta posterior per arm. Chosen over epsilon-greedy
 * because the exploration is proportional to genuine uncertainty rather than to a
 * fixed random rate: once an arm is clearly bad for someone, it stops being tried,
 * which matters when "pulling an arm" means interrupting a depressed person with a
 * style of message they have already shown they hate.
 *
 * The reward is NOT engagement. It comes from dependency/objective.ts, so an arm
 * that reliably produces long absorbing conversations and no change in mood
 * trajectory will lose to an arm that produces a two-line exchange and a walk
 * outside. This is the only learned component in the system and it is pointed at
 * the right target on purpose.
 *
 * Priors are optimistic-but-weak (2, 2): enough to try everything a few times,
 * light enough that ~8 real observations dominate them.
 */
import { REACH_KINDS, type ReachKind } from "./policy";

export interface ArmState {
  alpha: number;
  beta: number;
  pulls: number;
  lastPulledAt: number;
}

export type BanditState = Record<ReachKind, ArmState>;

export function emptyBandit(): BanditState {
  const s = {} as BanditState;
  for (const k of REACH_KINDS) s[k] = { alpha: 2, beta: 2, pulls: 0, lastPulledAt: 0 };
  return s;
}

/**
 * Map the objective score (roughly [-3, +2]) to the [0, 1] a Beta posterior needs.
 * The midpoint sits at 0 so a neutral outcome is genuinely neutral evidence rather
 * than weak positive evidence, which would let a useless arm drift upward forever.
 */
export function rewardToUnit(objectiveTotal: number): number {
  return 1 / (1 + Math.exp(-objectiveTotal * 1.2));
}

/** Marsaglia-Tsang gamma sampling, then Beta = G(a) / (G(a) + G(b)). */
function sampleGamma(shape: number, rng: () => number): number {
  if (shape < 1) return sampleGamma(shape + 1, rng) * Math.pow(rng(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number, v: number;
    do {
      // Box-Muller for the standard normal.
      const u1 = Math.max(rng(), 1e-12);
      const u2 = rng();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function sampleBeta(a: number, b: number, rng: () => number): number {
  const x = sampleGamma(a, rng);
  const y = sampleGamma(b, rng);
  return x / (x + y);
}

/**
 * @param allowed the arms the policy considers valid right now. `bridge` and
 *   `crisis_followup` are situational, so the bandit never gets to choose them
 *   freely - it only ranks the ones the policy already permits.
 */
export function selectArm(
  state: BanditState,
  allowed: ReachKind[],
  rng: () => number = Math.random,
): { kind: ReachKind; samples: Record<string, number> } {
  const samples: Record<string, number> = {};
  let best: ReachKind = allowed[0];
  let bestVal = -Infinity;

  for (const k of allowed) {
    const arm = state[k];
    const v = sampleBeta(arm.alpha, arm.beta, rng);
    samples[k] = Number(v.toFixed(3));
    if (v > bestVal) { bestVal = v; best = k; }
  }
  return { kind: best, samples };
}

export function updateArm(
  state: BanditState,
  kind: ReachKind,
  unitReward: number,
  at = Date.now(),
): BanditState {
  const r = Math.max(0, Math.min(1, unitReward));
  const arm = state[kind];
  return {
    ...state,
    [kind]: {
      // Fractional Beta update: a middling outcome moves both parameters a little
      // rather than being forced into a binary success/failure it does not fit.
      alpha: arm.alpha + r,
      beta: arm.beta + (1 - r),
      pulls: arm.pulls + 1,
      lastPulledAt: at,
    },
  };
}

/** A hard negative for an explicit "this wasn't useful". Worth more than a null result. */
export function penalizeArm(state: BanditState, kind: ReachKind): BanditState {
  const arm = state[kind];
  return { ...state, [kind]: { ...arm, beta: arm.beta + 2.5 } };
}

export function armSummary(state: BanditState): { kind: ReachKind; mean: number; pulls: number }[] {
  return REACH_KINDS.map((k) => ({
    kind: k,
    mean: state[k].alpha / (state[k].alpha + state[k].beta),
    pulls: state[k].pulls,
  })).sort((a, b) => b.mean - a.mean);
}
