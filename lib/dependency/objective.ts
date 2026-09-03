/**
 * The objective function.
 *
 * This file exists to make the optimisation target explicit and auditable, because
 * the target is the design. A companion app that optimises engagement will,
 * correctly and efficiently, make lonely people lonelier - it will learn that the
 * highest-reward user is one with nobody else, and it will act to produce more of
 * them. Not through malice; through gradient descent on the wrong number.
 *
 * So the reward here is:
 *
 *     J = w_wb * wellbeing_gain  -  w_dep * dependency  +  w_auto * autonomy_gain
 *
 * with a hard negative on the substitution term. Time-in-app appears nowhere.
 * Session count appears nowhere. The only place engagement enters is as a COST.
 *
 * Wellbeing gain is measured on the trend, not the level: the goal is not to make
 * someone happy in a conversation, which is easy and mostly means telling them what
 * they want to hear, but to see their multi-day valence trajectory improve. Those
 * two objectives point in noticeably different directions and this one is harder.
 *
 * The scores feed the bandit in lib/proactive/bandit.ts, which uses them to learn
 * which check-in styles actually help this particular person. That is the only
 * learned component in the loop, and this is the signal it learns from - so if this
 * function is wrong, everything downstream is wrong in a way that will look like
 * success.
 */
import type { DependencyAssessment } from "./index";
import type { MoodPoint } from "../trend";
import { mannKendall } from "../trend/mannKendall";
import { mean } from "../util/stats";
import { DAY } from "../util/time";

export interface OutcomeWindow {
  /** Points from before the intervention. */
  before: MoodPoint[];
  /** Points from after it. */
  after: MoodPoint[];
}

export interface ObjectiveScore {
  /** Change in valence *trend*, not level. Positive = trajectory improved. */
  wellbeingGain: number;
  /** Current dependency index, entering with a negative weight. */
  dependencyCost: number;
  /** Change in reference to other people and to forward-looking plans. */
  autonomyGain: number;
  /** Did they re-engage with the world - more social reference, more future focus? */
  substitutionPenalty: number;
  /** The scalar the bandit maximises. */
  total: number;
  breakdown: string[];
}

export const WEIGHTS = {
  wellbeing: 1.0,
  dependency: 0.85,
  autonomy: 0.6,
  substitution: 1.2,
} as const;

/** How long after an intervention we wait before scoring it. */
export const OUTCOME_LAG_MS = 2 * DAY;
export const OUTCOME_WINDOW_MS = 5 * DAY;

export function scoreOutcome(
  win: OutcomeWindow,
  dependency: DependencyAssessment,
): ObjectiveScore {
  const breakdown: string[] = [];

  // Wellbeing: difference in Theil-Sen slope before vs after. Slope, not mean,
  // because a check-in that produces a nice conversation and no change in
  // trajectory has not actually done anything.
  const slopeOf = (ps: MoodPoint[]) =>
    ps.length >= 7 ? mannKendall(ps.map((p) => p.at), ps.map((p) => p.valence)).slopePerDay : null;

  const sBefore = slopeOf(win.before);
  const sAfter = slopeOf(win.after);

  let wellbeingGain = 0;
  if (sBefore !== null && sAfter !== null) {
    wellbeingGain = Math.max(-1, Math.min(1, (sAfter - sBefore) * 2));
    breakdown.push(`valence slope ${sBefore.toFixed(3)} -> ${sAfter.toFixed(3)} per day`);
  } else if (win.after.length >= 3 && win.before.length >= 3) {
    // Not enough points for a trend test; fall back to level change, discounted,
    // and say so rather than pretending the trend estimate exists.
    const d = mean(win.after.map((p) => p.valence)) - mean(win.before.map((p) => p.valence));
    wellbeingGain = Math.max(-1, Math.min(1, d)) * 0.5;
    breakdown.push(`level change ${d.toFixed(3)} (too few points for a trend test)`);
  }

  // Autonomy: are they talking about other people and about what comes next?
  const social = (ps: MoodPoint[]) => mean(ps.map((p) => p.markers.socialReference));
  const future = (ps: MoodPoint[]) => mean(ps.map((p) => p.markers.futureFocus));

  const dSocial = social(win.after) - social(win.before);
  const dFuture = future(win.after) - future(win.before);
  const autonomyGain = Math.max(-1, Math.min(1, (dSocial * 12) + (dFuture * 8)));
  if (Math.abs(autonomyGain) > 0.05) {
    breakdown.push(
      `social reference ${dSocial >= 0 ? "+" : ""}${(dSocial * 100).toFixed(1)}pp, ` +
      `future focus ${dFuture >= 0 ? "+" : ""}${(dFuture * 100).toFixed(1)}pp`,
    );
  }

  // Substitution: contact with this went up while contact with people went down.
  // The one term with a weight above 1, because it is the failure this whole design
  // is organised around avoiding.
  const contactUp = win.after.length / Math.max(1, win.before.length) - 1;
  const substitutionPenalty = contactUp > 0.25 && dSocial < 0
    ? Math.min(1, contactUp) * Math.min(1, -dSocial * 15)
    : 0;
  if (substitutionPenalty > 0.05) {
    breakdown.push(`substitution: more contact here (+${(contactUp * 100).toFixed(0)}%), less elsewhere`);
  }

  const total =
    WEIGHTS.wellbeing * wellbeingGain -
    WEIGHTS.dependency * dependency.index +
    WEIGHTS.autonomy * autonomyGain -
    WEIGHTS.substitution * substitutionPenalty;

  return {
    wellbeingGain,
    dependencyCost: dependency.index,
    autonomyGain,
    substitutionPenalty,
    total,
    breakdown,
  };
}

/**
 * The success condition for the whole product, stated so it can be checked.
 *
 * If someone's mood trajectory improves and their reliance on this falls, it
 * worked. If their mood improves and their reliance climbs, it did not - that is
 * the addictive-but-pleasant quadrant, and it is a failure however good the
 * retention numbers look. Graduation is a good outcome here, not churn.
 */
export function isWorking(
  moodTrendPerDay: number,
  dependencyIndex: number,
  dependencyTrend: number,
): { verdict: "working" | "pleasant-but-dependent" | "not-helping" | "unclear"; note: string } {
  const improving = moodTrendPerDay > 0.01;
  const relianceFalling = dependencyTrend < 0.005;

  if (improving && relianceFalling) {
    return { verdict: "working", note: "mood trending up, reliance flat or falling" };
  }
  if (improving && !relianceFalling && dependencyIndex > 0.45) {
    return {
      verdict: "pleasant-but-dependent",
      note: "mood is up but reliance is climbing - this is the failure mode that feels like success",
    };
  }
  if (!improving && dependencyIndex > 0.45) {
    return { verdict: "not-helping", note: "reliance up, mood not improving - escalate to human support" };
  }
  return { verdict: "unclear", note: "not enough signal yet" };
}
