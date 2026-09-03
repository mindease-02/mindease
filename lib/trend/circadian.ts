/**
 * Behavioural rhythm features derived from message timestamps alone.
 *
 * These are covariates, not conclusions. Sleep-wake disruption is one of the most
 * robust behavioural correlates of depressive episodes and one of the earliest to
 * appear - often before the person's language changes at all. Because it comes
 * free from timestamps, it is the cheapest early signal available, and it is the
 * one that lets the system notice a slide during a stretch where someone is barely
 * talking.
 *
 * What we compute:
 *  - Circadian drift: shift in the centre of mass of activity vs the personal norm.
 *  - Late-night share: activity in the 01:00-05:00 window, when insomnia shows up.
 *  - Withdrawal: lengthening gaps between sessions, and shortening sessions.
 *  - Regularity: dispersion of daily activity times. Rhythms flatten and scatter.
 *
 * We only ever use the user's own history as the reference. Night-shift workers,
 * new parents and people in other time zones are not depressed for being awake at
 * 03:00, and a population baseline would say they are.
 */
import { circularMeanHours, hourOfDayLocal } from "../util/time";
import { mean, stdev } from "../util/stats";

export interface RhythmFeatures {
  /** Hours the activity centre-of-mass has shifted later vs baseline. Signed. */
  circadianShiftHours: number;
  /** Share of recent messages between 01:00 and 05:00 local. */
  lateNightShare: number;
  lateNightShareBaseline: number;
  /** Median hours between sessions, recent vs baseline. */
  interSessionGapHours: number;
  interSessionGapBaseline: number;
  /** Messages per session, recent vs baseline. */
  sessionLength: number;
  sessionLengthBaseline: number;
  /** Circular SD of activity hour. Higher = less regular daily rhythm. */
  rhythmIrregularity: number;
  rhythmIrregularityBaseline: number;
  daysObserved: number;
}

export interface TimestampSeries {
  /** epoch ms, ascending */
  times: number[];
  /** IANA zone, e.g. "Europe/London". Falls back to UTC. */
  timeZone: string;
}

/** Messages more than this far apart are treated as separate sessions. */
const SESSION_GAP_MS = 45 * 60 * 1000;
const RECENT_WINDOW_MS = 7 * 86_400_000;
const BASELINE_WINDOW_MS = 42 * 86_400_000;

export function rhythmFeatures(series: TimestampSeries, now = Date.now()): RhythmFeatures {
  const { times, timeZone } = series;
  const recent = times.filter((t) => t >= now - RECENT_WINDOW_MS);
  const baseline = times.filter((t) => t < now - RECENT_WINDOW_MS && t >= now - BASELINE_WINDOW_MS);

  const empty: RhythmFeatures = {
    circadianShiftHours: 0, lateNightShare: 0, lateNightShareBaseline: 0,
    interSessionGapHours: 0, interSessionGapBaseline: 0,
    sessionLength: 0, sessionLengthBaseline: 0,
    rhythmIrregularity: 0, rhythmIrregularityBaseline: 0,
    daysObserved: times.length ? (now - times[0]) / 86_400_000 : 0,
  };
  if (recent.length < 5 || baseline.length < 10) return empty;

  const rh = recent.map((t) => hourOfDayLocal(t, timeZone));
  const bh = baseline.map((t) => hourOfDayLocal(t, timeZone));

  const rc = circularMeanHours(rh);
  const bc = circularMeanHours(bh);
  let shift = rc.mean - bc.mean;
  if (shift > 12) shift -= 24;
  if (shift < -12) shift += 24;

  const lateShare = (hs: number[]) => hs.filter((h) => h >= 1 && h < 5).length / hs.length;
  const gaps = (ts: number[]) => {
    const g: number[] = [];
    for (let i = 1; i < ts.length; i++) {
      const d = ts[i] - ts[i - 1];
      if (d >= SESSION_GAP_MS) g.push(d / 3_600_000);
    }
    return g;
  };
  const sessionsOf = (ts: number[]) => {
    const lens: number[] = [];
    let cur = 1;
    for (let i = 1; i < ts.length; i++) {
      if (ts[i] - ts[i - 1] >= SESSION_GAP_MS) { lens.push(cur); cur = 1; } else cur++;
    }
    lens.push(cur);
    return lens;
  };

  const rg = gaps(recent), bg = gaps(baseline);
  const rs = sessionsOf(recent), bs = sessionsOf(baseline);

  return {
    circadianShiftHours: shift,
    lateNightShare: lateShare(rh),
    lateNightShareBaseline: lateShare(bh),
    interSessionGapHours: rg.length ? mean(rg) : 0,
    interSessionGapBaseline: bg.length ? mean(bg) : 0,
    sessionLength: mean(rs),
    sessionLengthBaseline: mean(bs),
    rhythmIrregularity: rc.circularSd,
    rhythmIrregularityBaseline: bc.circularSd,
    daysObserved: (now - times[0]) / 86_400_000,
  };
}

/**
 * Collapse the rhythm features into a single 0..1 "behavioural withdrawal" score.
 * Each term is a change relative to the person's own baseline, capped so no single
 * feature can carry the score on its own.
 */
export function withdrawalScore(f: RhythmFeatures): { score: number; reasons: string[] } {
  if (f.daysObserved < 10) return { score: 0, reasons: [] };
  const reasons: string[] = [];
  const cap = (x: number) => Math.max(0, Math.min(1, x));
  let score = 0;

  const lateDelta = f.lateNightShare - f.lateNightShareBaseline;
  if (lateDelta > 0.12) {
    score += 0.30 * cap(lateDelta / 0.35);
    reasons.push("more activity in the small hours than is usual for you");
  }
  if (f.circadianShiftHours > 1.5) {
    score += 0.20 * cap(f.circadianShiftHours / 4);
    reasons.push(`your day has drifted about ${f.circadianShiftHours.toFixed(1)}h later`);
  }
  if (f.interSessionGapBaseline > 0 && f.interSessionGapHours > f.interSessionGapBaseline * 1.6) {
    score += 0.25 * cap(f.interSessionGapHours / (f.interSessionGapBaseline * 3));
    reasons.push("longer gaps between the times you reach out");
  }
  if (f.sessionLengthBaseline > 0 && f.sessionLength < f.sessionLengthBaseline * 0.6) {
    score += 0.15 * cap(1 - f.sessionLength / f.sessionLengthBaseline);
    reasons.push("shorter exchanges than usual");
  }
  if (f.rhythmIrregularityBaseline > 0 && f.rhythmIrregularity > f.rhythmIrregularityBaseline * 1.4) {
    score += 0.10;
    reasons.push("a less regular daily rhythm");
  }

  return { score: cap(score), reasons };
}
