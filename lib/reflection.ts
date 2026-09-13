/**
 * The weekly reflection: the one place the anti-reliance design is felt
 * rather than claimed. Counts messages here against mentions of people in
 * the person's life, check-ins sent, tools used, and moments they noticed.
 *
 * Nothing here is a score. There is no streak, no level, no total. The only
 * comparison is with their own previous week, and the copy for a week that
 * leaned inward is a plain observation, not a penalty.
 */
import type { UserState } from "./store/types";
import { DAY } from "./util/time";

export interface WeekSlice {
  /** Messages the person sent here. */
  here: number;
  /** Messages that referred to other people (friends, family, colleagues, "we"). */
  people: number;
  /** Unprompted messages MindEase sent. */
  checkins: number;
  /** Coping tools tried (breathing, grounding, a screening). */
  tools: number;
  /** Moments of insight the model marked. */
  moments: number;
  /** Separate conversations here (messages more than 45 minutes apart start a new one). */
  conversations: number;
  /** Times the person logged talking to someone in their life. */
  logged: number;
}

export interface WeeklyReflection {
  thisWeek: WeekSlice;
  lastWeek: WeekSlice;
  /** Share of messages that pointed outward, 0..1, this week and last. null when too little to say. */
  outward: number | null;
  outwardPrev: number | null;
  /** "up" when the outward share rose by a meaningful margin; "down" when it fell; "flat" otherwise; "quiet" when too little data. */
  direction: "up" | "flat" | "down" | "quiet";
  /** True when check-ins shrank because things look steadier, not because the person went quiet. */
  steadier: boolean;
  /** Smoothed outward share over the last four weeks, for the growth visual. */
  outwardTrend: number[];
}

function slice(state: UserState, from: number, to: number): WeekSlice {
  const pts = state.history.filter((p) => p.at >= from && p.at < to);
  const people = pts.filter((p) => (p.markers?.socialReference ?? 0) > 0).length;
  const checkins = state.outreach.filter((o) => o.at >= from && o.at < to).length;
  const tools = (state.tools ?? []).filter((x) => x.at >= from && x.at < to).length;
  const moments = (state.milestones ?? []).filter((x) => x.at >= from && x.at < to).length;
  let conversations = 0;
  for (let i = 0; i < pts.length; i++) if (i === 0 || pts[i].at - pts[i - 1].at >= 45 * 60_000) conversations++;
  const logged = (state.peopleContacts ?? []).filter((x) => x.at >= from && x.at < to).length;
  return { here: pts.length, people, checkins, tools, moments, conversations, logged };
}

/**
 * The people-vs-MindEase share: moments that pointed at people in their life (mentions and
 * logged conversations) against separate conversations here. Counting conversations rather
 * than messages keeps one long chat from swamping the week.
 */
const share = (s: WeekSlice): number | null => {
  const outward = s.people + s.logged;
  if (s.here < 5 && s.logged < 2) return null;
  return outward / Math.max(1, outward + s.conversations);
};

export function weeklyReflection(state: UserState, now = Date.now()): WeeklyReflection {
  const thisWeek = slice(state, now - 7 * DAY, now + 1);
  const lastWeek = slice(state, now - 14 * DAY, now - 7 * DAY);
  const outward = share(thisWeek), outwardPrev = share(lastWeek);
  let direction: WeeklyReflection["direction"] = "quiet";
  if (outward !== null && outwardPrev !== null) {
    const d = outward - outwardPrev;
    direction = d > 0.06 ? "up" : d < -0.06 ? "down" : "flat";
  } else if (outward !== null) direction = "flat";
  // Steadier: fewer check-ins than last week while the person still showed up, and the week did not lean inward.
  const steadier = thisWeek.checkins < lastWeek.checkins && thisWeek.here >= 3 && direction !== "down";
  const outwardTrend: number[] = [];
  for (let w = 3; w >= 0; w--) {
    const s = share(slice(state, now - (w + 1) * 7 * DAY, now - w * 7 * DAY + (w === 0 ? 1 : 0)));
    outwardTrend.push(s ?? (outwardTrend.length ? outwardTrend[outwardTrend.length - 1] : 0));
  }
  return { thisWeek, lastWeek, outward, outwardPrev, direction, steadier, outwardTrend };
}

/** Tools tried, grouped, most used first. Names are i18n keys the client resolves. */
export function toolsSummary(state: UserState): { kind: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const x of state.tools ?? []) counts.set(x.kind, (counts.get(x.kind) ?? 0) + 1);
  return [...counts.entries()].map(([kind, count]) => ({ kind, count })).sort((a, b) => b.count - a.count);
}
