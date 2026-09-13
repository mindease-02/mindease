/**
 * When to put crisis help on screen, and whether to ask first.
 *
 * Explicit language (the deterministic patterns, or the model second opinion
 * at "active" and above) shows help immediately; nobody should have to
 * confirm anything to see a phone number. Implicit signals (softer patterns,
 * a model-only "passive", several very low messages in a row) ask first:
 * "Some of what you've said sounds heavy. Do you want to see who you can
 * talk to right now?" That avoids alarming someone who is having a bad day,
 * without ever hiding help from someone who asks for it.
 *
 * Pending clinician review: the thresholds below.
 */
import { atLeast, type RiskAssessment } from "../safety/crisis";
import type { MoodPoint } from "../trend";
import { HOUR } from "../util/time";

export type CrisisSurface = "show" | "confirm" | null;

export function decideCrisisSurface(args: {
  regex: RiskAssessment;
  final: RiskAssessment;
  modelRaised: boolean;
  history: MoodPoint[];
  valenceNow: number;
  lastConfirmAt?: number;
  stickyTier: { tier: string; at: number };
  now: number;
}): CrisisSurface {
  const { regex, final, modelRaised, history, valenceNow, now } = args;
  if (atLeast(final.tier, "active")) return "show";
  if (atLeast(args.stickyTier.tier as RiskAssessment["tier"], "active") && now - args.stickyTier.at < 6 * HOUR) return "show";
  if (regex.tier === "passive" && !regex.discounted && regex.strength >= 0.7) return "show";
  const recentlyAsked = !!args.lastConfirmAt && now - args.lastConfirmAt < 12 * HOUR;
  if (recentlyAsked) return null;
  if (regex.tier === "passive" || (modelRaised && final.tier === "passive")) return "confirm";
  const lately = history.filter((p) => p.at > now - 48 * HOUR).slice(-4);
  const veryLow = lately.filter((p) => p.valence < -0.5).length;
  if (valenceNow < -0.5 && veryLow >= 3) return "confirm";
  return null;
}
