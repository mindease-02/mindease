/**
 * Lifestyle patterns → behaviour prediction.
 *
 * People are more regular than they feel. From nothing but when they talk and
 * how they read at the time, this derives: when in the day they are active,
 * late-night share (a sleep proxy), which weekdays and day-parts run low for
 * THEM (never a population norm), how often they usually come back, and from
 * those a prediction for right now: expected valence and whether this is one
 * of their low windows. Used by the prompt ("likely today"), the evening
 * check-in gate, the Mirror (one plain line), and the training export.
 *
 * Everything needs enough samples to say anything; below that it says nothing.
 */
import type { MoodPoint } from "../trend";

export interface LifestyleView {
  sufficient: boolean;
  /** Plain-language lines about the person, 0-5. */
  lines: string[];
  /** Prediction for `now`. */
  now: { expectedValence: number | null; predictedLow: boolean; window: string };
  facts: {
    activeWindow: string;            // "evenings", "late nights", "mornings", "spread through the day"
    lateNightShare: number;          // 0..1 of sessions between 23:00 and 04:00
    lateNights7d: number;            // distinct late nights in the last 7 days
    lowestDay: { day: string; delta: number } | null;
    highestDay: { day: string; delta: number } | null;
    lowestPart: { part: string; delta: number } | null;
    usualGapDays: number | null;     // median gap between sessions
    currentGapDays: number | null;
    weekendDelta: number | null;     // weekend − weekday valence
    /** Inferred sleep window (local hours, may wrap midnight), from the longest quiet stretch in their activity. */
    sleepWindow: { from: number; to: number } | null;
  };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PARTS = ["mornings", "afternoons", "evenings", "late nights"] as const;

function local(at: number, tz: string): { hour: number; day: number; key: string } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(at));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const hour = Number(get("hour")) % 24;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { hour, day: day < 0 ? new Date(at).getDay() : day, key: `${get("year")}-${get("month")}-${get("day")}` };
  } catch {
    const d = new Date(at); return { hour: d.getHours(), day: d.getDay(), key: d.toISOString().slice(0, 10) };
  }
}
const partOf = (h: number) => (h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 23 ? 2 : 3);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

/** Sessions: points separated by more than 45 minutes start a new one. */
function sessions(points: MoodPoint[]): number[] {
  const starts: number[] = [];
  let last = -Infinity;
  for (const p of [...points].sort((a, b) => a.at - b.at)) { if (p.at - last > 45 * 60_000) starts.push(p.at); last = p.at; }
  return starts;
}

export function lifestylePatterns(points: MoodPoint[], tz: string, now = Date.now()): LifestyleView {
  const empty: LifestyleView = {
    sufficient: false, lines: [], now: { expectedValence: null, predictedLow: false, window: "" },
    facts: { activeWindow: "", lateNightShare: 0, lateNights7d: 0, lowestDay: null, highestDay: null, lowestPart: null, usualGapDays: null, currentGapDays: null, weekendDelta: null, sleepWindow: null },
  };
  const pts = points.filter((p) => p.confidence >= 0.3);
  const starts = sessions(pts);
  if (pts.length < 12 || starts.length < 5) return empty;

  const overall = mean(pts.map((p) => p.valence));
  const loc = pts.map((p) => ({ ...local(p.at, tz), v: p.valence, at: p.at }));

  // Active window from session starts.
  const partCounts = [0, 0, 0, 0];
  for (const s of starts) partCounts[partOf(local(s, tz).hour)]++;
  const top = partCounts.indexOf(Math.max(...partCounts));
  const spread = Math.max(...partCounts) / starts.length < 0.45;
  const activeWindow = spread ? "spread through the day" : PARTS[top];
  const lateNightShare = partCounts[3] / starts.length;
  const week = now - 7 * 86_400_000;
  const lateNights7d = new Set(starts.filter((s) => s >= week && partOf(local(s, tz).hour) === 3).map((s) => local(s - 6 * 3600_000, tz).key)).size;

  // Per-weekday and per-part deltas (need ≥3 samples each).
  const byDay: number[][] = Array.from({ length: 7 }, () => []);
  const byPart: number[][] = Array.from({ length: 4 }, () => []);
  for (const l of loc) { byDay[l.day].push(l.v); byPart[partOf(l.hour)].push(l.v); }
  const dayDeltas = byDay.map((xs, i) => (xs.length >= 3 ? { day: DAYS[i], delta: mean(xs) - overall, n: xs.length } : null)).filter(Boolean) as { day: string; delta: number; n: number }[];
  const partDeltas = byPart.map((xs, i) => (xs.length >= 3 ? { part: PARTS[i], delta: mean(xs) - overall } : null)).filter(Boolean) as { part: string; delta: number }[];
  const lowestDay = dayDeltas.length >= 3 ? dayDeltas.reduce((a, b) => (b.delta < a.delta ? b : a)) : null;
  const highestDay = dayDeltas.length >= 3 ? dayDeltas.reduce((a, b) => (b.delta > a.delta ? b : a)) : null;
  const lowestPart = partDeltas.length >= 2 ? partDeltas.reduce((a, b) => (b.delta < a.delta ? b : a)) : null;
  const wk = loc.filter((l) => l.day === 0 || l.day === 6).map((l) => l.v), wd = loc.filter((l) => l.day > 0 && l.day < 6).map((l) => l.v);
  const weekendDelta = wk.length >= 4 && wd.length >= 4 ? mean(wk) - mean(wd) : null;

  // Sleep window: the longest run of hours with no session starts, if they have enough days to say.
  const hourHist = new Array(24).fill(0);
  for (const st of starts) hourHist[local(st, tz).hour]++;
  const days = new Set(starts.map((st) => local(st, tz).key)).size;
  let sleepWindow: { from: number; to: number } | null = null;
  if (starts.length >= 10 && days >= 5) {
    let best = { start: 0, len: 0 }, run = 0, runStart = 0;
    for (let i = 0; i < 48; i++) { const h = i % 24; if (hourHist[h] === 0) { if (run === 0) runStart = h; run++; if (run > best.len) best = { start: runStart, len: run }; } else run = 0; }
    if (best.len >= 5 && best.len <= 14) sleepWindow = { from: (best.start + 23.5) % 24, to: (best.start + best.len + 0.5) % 24 };
  }

  // Return cadence.
  const gaps = starts.slice(1).map((s, i) => (s - starts[i]) / 86_400_000);
  const usualGapDays = gaps.length >= 3 ? median(gaps) : null;
  const currentGapDays = (now - starts[starts.length - 1]) / 86_400_000;

  // Prediction for now.
  const here = local(now, tz);
  const dDay = dayDeltas.find((d) => d.day === DAYS[here.day])?.delta ?? 0;
  const dPart = partDeltas.find((p) => p.part === PARTS[partOf(here.hour)])?.delta ?? 0;
  const expectedValence = overall + 0.6 * dDay + 0.6 * dPart;
  const predictedLow = expectedValence < overall - 0.12 || (lowestPart !== null && lowestPart.part === PARTS[partOf(here.hour)] && lowestPart.delta < -0.15);

  const lines: string[] = [];
  lines.push(`You mostly talk to MindEase in the ${activeWindow === "spread through the day" ? "day, at no particular time" : activeWindow}.`);
  if (lateNights7d >= 3) lines.push(`You've been up past 11pm on ${lateNights7d} of the last 7 nights.`);
  if (lowestPart && lowestPart.delta < -0.15) lines.push(`${lowestPart.part[0].toUpperCase() + lowestPart.part.slice(1)} tend to be your lowest stretch.`);
  if (lowestDay && lowestDay.delta < -0.15) lines.push(`${lowestDay.day}s run lower than the rest of your week.`);
  if (highestDay && highestDay.delta > 0.15 && highestDay.day !== lowestDay?.day) lines.push(`${highestDay.day}s are usually your better days.`);
  if (weekendDelta !== null && Math.abs(weekendDelta) > 0.18) lines.push(weekendDelta < 0 ? "Weekends tend to be harder than weekdays for you." : "Weekends tend to be easier than weekdays for you.");
  if (usualGapDays !== null && currentGapDays > usualGapDays * 2.2 && currentGapDays > 2) lines.push(`You usually come back about every ${usualGapDays < 1.5 ? "day" : `${Math.round(usualGapDays)} days`}; it's been ${Math.round(currentGapDays)}.`);

  return {
    sufficient: true, lines: lines.slice(0, 5),
    now: { expectedValence: Number(expectedValence.toFixed(2)), predictedLow, window: `${DAYS[here.day]} ${PARTS[partOf(here.hour)]}` },
    facts: { sleepWindow, activeWindow, lateNightShare: Number(lateNightShare.toFixed(2)), lateNights7d, lowestDay: lowestDay ? { day: lowestDay.day, delta: Number(lowestDay.delta.toFixed(2)) } : null, highestDay: highestDay ? { day: highestDay.day, delta: Number(highestDay.delta.toFixed(2)) } : null, lowestPart: lowestPart ? { part: lowestPart.part, delta: Number(lowestPart.delta.toFixed(2)) } : null, usualGapDays: usualGapDays !== null ? Number(usualGapDays.toFixed(1)) : null, currentGapDays: Number(currentGapDays.toFixed(1)), weekendDelta: weekendDelta !== null ? Number(weekendDelta.toFixed(2)) : null },
  };
}
