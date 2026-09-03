/** Time helpers. Everything is timezone-aware because circadian features are the point. */

const fmtCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = fmtCache.get(timeZone);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat("en-GB", {
        timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      });
    } catch {
      f = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      });
    }
    fmtCache.set(timeZone, f);
  }
  return f;
}

/** Local hour as a float, e.g. 23.5 for 23:30. */
export function hourOfDayLocal(epochMs: number, timeZone = "UTC"): number {
  const parts = formatter(timeZone).formatToParts(new Date(epochMs));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

/**
 * Mean and dispersion of clock hours, computed on the circle. Arithmetic mean is
 * wrong here: 23:00 and 01:00 average to noon, which would report a night owl as
 * a midday person and quietly break every circadian feature downstream.
 */
export function circularMeanHours(hours: number[]): { mean: number; circularSd: number } {
  if (!hours.length) return { mean: 0, circularSd: 0 };
  let sx = 0, sy = 0;
  for (const h of hours) {
    const a = (h / 24) * 2 * Math.PI;
    sx += Math.cos(a);
    sy += Math.sin(a);
  }
  sx /= hours.length;
  sy /= hours.length;
  const r = Math.sqrt(sx * sx + sy * sy);
  let angle = Math.atan2(sy, sx);
  if (angle < 0) angle += 2 * Math.PI;
  return {
    mean: (angle / (2 * Math.PI)) * 24,
    // Circular SD in hours; r near 1 means tightly clustered.
    circularSd: r < 1e-9 ? 12 : Math.min(12, Math.sqrt(-2 * Math.log(r)) * (24 / (2 * Math.PI))),
  };
}

export function isQuietHours(epochMs: number, timeZone: string, from = 22.5, to = 8): boolean {
  const h = hourOfDayLocal(epochMs, timeZone);
  return from > to ? h >= from || h < to : h >= from && h < to;
}

export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export function humanGap(ms: number): string {
  const h = ms / HOUR;
  if (h < 1) return `${Math.round(ms / 60000)} minutes`;
  if (h < 36) return `${Math.round(h)} hours`;
  return `${Math.round(h / 24)} days`;
}
