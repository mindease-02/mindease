/**
 * Daily averages of the eight axes, for the "how your read has changed" chart.
 * Eight numbers per day, no text, ninety days kept.
 */
import type { Octant } from "../affect/octant";
import { AXES } from "./corrections";

export interface AxesDay { day: string; sum: number[]; n: number }

export function dayKey(at: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
  } catch { return new Date(at).toISOString().slice(0, 10); }
}

export function addDay(days: AxesDay[] | undefined, axes: Octant, at: number, timeZone: string, weight = 1): AxesDay[] {
  const key = dayKey(at, timeZone);
  const list = [...(days ?? [])];
  let row = list.find((d) => d.day === key);
  if (!row) { row = { day: key, sum: AXES.map(() => 0), n: 0 }; list.push(row); }
  AXES.forEach((a, i) => { row!.sum[i] = Number((row!.sum[i] + axes[a] * weight).toFixed(4)); });
  row.n = Number((row.n + weight).toFixed(4));
  return list.sort((a, b) => a.day.localeCompare(b.day)).slice(-90);
}

/** Weekly means for the last `weeks` weeks, oldest first; null where there was no data. */
export function weeklyMeans(days: AxesDay[] | undefined, now: number, timeZone: string, weeks = 8): { label: string; values: (number | null)[] }[] {
  const rows = days ?? [];
  return AXES.map((axis, i) => {
    const values: (number | null)[] = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const from = dayKey(now - (w + 1) * 7 * 86_400_000 + 86_400_000, timeZone), to = dayKey(now - w * 7 * 86_400_000, timeZone);
      const inWeek = rows.filter((d) => d.day >= from && d.day <= to);
      const n = inWeek.reduce((s, d) => s + d.n, 0);
      values.push(n > 0 ? inWeek.reduce((s, d) => s + d.sum[i], 0) / n : null);
    }
    return { label: axis, values };
  });
}
