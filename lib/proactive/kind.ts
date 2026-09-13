/**
 * Which style of check-in to send, as a fixed rule rather than a learner.
 *
 * MindEase does not learn from how people respond (docs/mindease-system-prompt.md,
 * "Hard line"). The one adjustment is the one the system prompt requires: a style
 * the person marked "not useful" becomes rarer for them. Two such marks in sixty
 * days and that style is skipped in favour of the least-rejected alternative.
 */
import type { OutreachRecord, ReachKind } from "./policy";

const STYLES: ReachKind[] = ["observation", "callback", "light_touch"];
const WINDOW = 60 * 86_400_000;

export function pickCheckinKind(preferred: ReachKind, history: OutreachRecord[], now: number): ReachKind {
  if (!STYLES.includes(preferred)) return preferred;
  const rejected = (k: ReachKind) => history.filter((h) => h.kind === k && h.rejected && now - h.at < WINDOW).length;
  if (rejected(preferred) < 2) return preferred;
  return [...STYLES].sort((a, b) => rejected(a) - rejected(b))[0];
}
