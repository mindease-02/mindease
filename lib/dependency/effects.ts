/**
 * What reliance actually changes, in one place, so the loop can be tested end to end:
 * reliance tier -> check-in budget -> reply length -> the note the person sees.
 */
import { countermeasuresFor, type DependencyTier } from ".";
import { weeklyReflection } from "../reflection";
import { dayKey } from "../reading/daily";
import type { UserState } from "../store/types";

/** Output token ceiling for a reply. Crisis turns always get the full budget. */
export function replyBudget(tier: DependencyTier, crisisTurn: boolean): { maxTokens: number; maxSentences: number | null } {
  if (crisisTurn) return { maxTokens: 420, maxSentences: null };
  const c = countermeasuresFor(tier);
  const maxTokens = ({ healthy: 420, watch: 380, elevated: 300, high: 240 } as const)[tier];
  return { maxTokens, maxSentences: c.shortenResponses ? (tier === "high" ? 3 : 4) : null };
}

/** Weekly check-in budget after reliance is taken into account. */
export function effectiveWeeklyBudget(weekly: number, tier: DependencyTier): number {
  return Math.max(1, Math.floor(weekly * countermeasuresFor(tier).reachOutBudgetMultiplier));
}

/** Separate conversations today (45-minute gaps), for "you've talked to me N times today". */
export function conversationsToday(state: UserState, now: number): number {
  const today = dayKey(now, state.timeZone);
  const pts = state.history.filter((p) => dayKey(p.at, state.timeZone) === today);
  let n = 0;
  for (let i = 0; i < pts.length; i++) if (i === 0 || pts[i].at - pts[i - 1].at >= 45 * 60_000) n++;
  return n;
}

/**
 * The one quiet note at the top of the chat. "shorter" when reliance is elevated or high
 * (at most once a week); otherwise "steadier" when check-ins shrank while the person still
 * showed up (at most once per week). Returns the updated notices record to store.
 */
export function chatNotice(state: UserState, tier: DependencyTier, now: number): { notice: "steadier" | "shorter" | null; notices: NonNullable<UserState["notices"]> } {
  const notices = { ...(state.notices ?? {}) };
  const monday = dayKey(now - ((new Date(now).getUTCDay() + 6) % 7) * 86_400_000, state.timeZone);
  if ((tier === "elevated" || tier === "high") && (!notices.shorterAt || now - notices.shorterAt > 7 * 86_400_000)) {
    notices.shorterAt = now;
    return { notice: "shorter", notices };
  }
  if (weeklyReflection(state, now).steadier && notices.steadierWeek !== monday) {
    notices.steadierWeek = monday;
    return { notice: "steadier", notices };
  }
  return { notice: null, notices };
}
