/**
 * The trend engine. This is what replaces the timer.
 *
 * A scheduled job runs periodically, but it does not send anything. All it does is
 * call assessTrend() and hand the result to the proactivity policy, which decides
 * whether there is anything worth saying. The cron is a heartbeat for *evaluation*;
 * the decision to speak comes from evidence about the person. Those are different
 * things, and conflating them is how companion apps end up sending "Just checking
 * in! :)" every morning at 9am forever.
 *
 * Four independent detectors vote:
 *   1. EWMA momentum   - fast trace below slow trace: currently sliding.
 *   2. Mann-Kendall    - significant monotone decline over the recent series.
 *   3. CUSUM           - a recent sustained step down from the personal reference.
 *   4. Rhythm + markers- behavioural withdrawal and linguistic drift, which move
 *                        even when the person has stopped saying much at all.
 *
 * Requiring agreement across detectors that fail in different ways is the main
 * defence against the failure mode that matters here: reaching out to someone
 * because of statistical noise, being wrong, and teaching them that the concern
 * is meaningless.
 */
import type { LinguisticMarkers } from "../affect/types";
import { mean } from "../util/stats";
import { DAY } from "../util/time";
import { ageEwma, momentum, type EwmaState } from "./ewma";
import { type CusumState } from "./cusum";
import { rhythmFeatures, withdrawalScore, type RhythmFeatures, type TimestampSeries } from "./circadian";
import { mannKendall, MIN_POINTS, NO_TREND, type TrendTest } from "./mannKendall";

/** One point in the tracked history. Deliberately small - this is all we persist. */
export interface MoodPoint {
  at: number;
  valence: number;
  arousal: number;
  dominance: number;
  confidence: number;
  markers: LinguisticMarkers;
  /** True if the text and behavioural channels disagreed on this turn. */
  incongruent?: boolean;
}

export interface MarkerDrift {
  firstPersonSingular: number;
  absolutist: number;
  socialReference: number;
  lexicalDiversity: number;
  futureFocus: number;
  /** 0..1 composite. */
  score: number;
  reasons: string[];
}

export interface TrendAssessment {
  now: number;
  ewma: EwmaState;
  momentum: number;
  mk: TrendTest;
  cusum: CusumState;
  rhythm: RhythmFeatures;
  withdrawal: { score: number; reasons: string[] };
  drift: MarkerDrift;
  /** 0..1. The single number the proactivity policy thresholds on. */
  triggerScore: number;
  /** How many independent detectors are firing. Policy requires >= 2. */
  agreement: number;
  /** Plain-language evidence, shown to the user verbatim on request. */
  evidence: string[];
  /** Enough history to say anything at all? */
  sufficient: boolean;
}

const RECENT_MS = 10 * DAY;
const BASELINE_MS = 45 * DAY;

export function assessTrend(
  history: MoodPoint[],
  ewmaState: EwmaState,
  cusumState: CusumState,
  timeZone: string,
  now = Date.now(),
): TrendAssessment {
  const recent = history.filter((p) => p.at >= now - RECENT_MS && p.confidence > 0.25);
  const aged = ageEwma(ewmaState, now);
  const mom = momentum(aged);

  const mk = recent.length >= MIN_POINTS
    ? mannKendall(recent.map((p) => p.at), recent.map((p) => p.valence))
    : { ...NO_TREND, n: recent.length };

  const rhythm = rhythmFeatures(
    { times: history.map((p) => p.at), timeZone } satisfies TimestampSeries,
    now,
  );
  const withdrawal = withdrawalScore(rhythm);
  const drift = markerDrift(history, now);

  const evidence: string[] = [];
  let agreement = 0;
  let score = 0;

  // 1. Momentum. Weakest single signal, so it is capped low and never fires alone.
  if (mom < -0.12 && aged.weight > 2) {
    agreement++;
    score += 0.20 * Math.min(1, -mom / 0.5);
    evidence.push(`your recent tone is running below your last few weeks (${mom.toFixed(2)})`);
  }

  // 2. Significant monotone decline. The primary detector.
  if (mk.direction === "down" && mk.p < 0.08 && mk.tau < -0.2) {
    agreement++;
    score += 0.38 * Math.min(1, Math.abs(mk.tau) / 0.55);
    evidence.push(
      `a downward trend across your last ${mk.n} exchanges ` +
      `(Kendall tau ${mk.tau.toFixed(2)}, p=${mk.p.toFixed(3)}, about ${mk.slopePerDay.toFixed(2)}/day)`,
    );
  }

  // 3. Change point. Fires on the sudden-drop case Mann-Kendall misses.
  if (cusumState.alarm) {
    agreement++;
    score += 0.32 * Math.min(1, cusumState.low / 3);
    const since = cusumState.shiftStartedAt
      ? ` starting around ${new Date(cusumState.shiftStartedAt).toDateString()}`
      : "";
    evidence.push(`a distinct step down from your usual baseline${since}`);
  }

  // 4. Behaviour and language, which move when someone stops talking.
  if (withdrawal.score > 0.3 || drift.score > 0.35) {
    agreement++;
    score += 0.25 * Math.max(withdrawal.score, drift.score);
    evidence.push(...withdrawal.reasons, ...drift.reasons);
  }

  // Incongruence: repeatedly saying "fine" while the behavioural channels disagree.
  const incong = recent.filter((p) => p.incongruent).length;
  if (incong >= 3 && incong / Math.max(1, recent.length) > 0.3) {
    score += 0.12;
    evidence.push("several times lately, what you wrote and how you said it did not match");
  }

  // A single detector is not enough. Two agreeing detectors that fail differently is.
  if (agreement < 2) score *= 0.45;

  const sufficient = history.length >= 12 && rhythm.daysObserved >= 5;
  if (!sufficient) score = 0;

  return {
    now,
    ewma: aged,
    momentum: mom,
    mk,
    cusum: cusumState,
    rhythm,
    withdrawal,
    drift,
    triggerScore: Math.max(0, Math.min(1, score)),
    agreement,
    evidence,
    sufficient,
  };
}

/**
 * Drift in psycholinguistic markers, recent window vs personal baseline.
 * Expressed as relative change so it works for people with very different
 * baseline writing styles.
 */
export function markerDrift(history: MoodPoint[], now = Date.now()): MarkerDrift {
  const recent = history.filter((p) => p.at >= now - RECENT_MS);
  const base = history.filter((p) => p.at < now - RECENT_MS && p.at >= now - BASELINE_MS);

  const empty: MarkerDrift = {
    firstPersonSingular: 0, absolutist: 0, socialReference: 0,
    lexicalDiversity: 0, futureFocus: 0, score: 0, reasons: [],
  };
  if (recent.length < 5 || base.length < 8) return empty;

  const avg = (ps: MoodPoint[], k: keyof LinguisticMarkers) =>
    mean(ps.map((p) => Number(p.markers[k]) || 0));

  // Weight by tokens implicitly: markers from very short turns are noisy, so we
  // drop turns under 6 tokens from marker comparisons entirely.
  const R = recent.filter((p) => p.markers.tokens >= 6);
  const B = base.filter((p) => p.markers.tokens >= 6);
  if (R.length < 4 || B.length < 6) return empty;

  const rel = (k: keyof LinguisticMarkers) => {
    const b = avg(B, k);
    const r = avg(R, k);
    return b < 1e-6 ? (r > 1e-6 ? 1 : 0) : (r - b) / b;
  };

  const d = {
    firstPersonSingular: rel("firstPersonSingular"),
    absolutist: rel("absolutist"),
    socialReference: rel("socialReference"),
    lexicalDiversity: rel("lexicalDiversity"),
    futureFocus: rel("futureFocus"),
  };

  const reasons: string[] = [];
  let score = 0;
  const cap = (x: number) => Math.max(0, Math.min(1, x));

  if (d.firstPersonSingular > 0.35) {
    score += 0.28 * cap(d.firstPersonSingular / 1.2);
    reasons.push("more self-focused language than your usual");
  }
  if (d.absolutist > 0.4) {
    score += 0.30 * cap(d.absolutist / 1.5);
    reasons.push("more absolute words - always, never, nothing");
  }
  if (d.socialReference < -0.3) {
    score += 0.24 * cap(-d.socialReference / 0.8);
    reasons.push("fewer mentions of other people");
  }
  if (d.futureFocus < -0.35) {
    score += 0.22 * cap(-d.futureFocus / 0.8);
    reasons.push("less talk about what is coming next");
  }
  if (d.lexicalDiversity < -0.2) {
    score += 0.12 * cap(-d.lexicalDiversity / 0.5);
    reasons.push("a narrower range of words than you normally use");
  }

  return { ...d, score: cap(score), reasons };
}
