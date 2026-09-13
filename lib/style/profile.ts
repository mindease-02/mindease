/**
 * Reply ratings: "helped" or "missed", with an optional reason.
 *
 * These do not change how MindEase replies, to this person or anyone. A system
 * that tunes itself toward "the person felt better after this reply" learns to
 * validate and stay available, which is the dependency this product exists to
 * prevent (docs/mindease-system-prompt.md, "Hard line"). Ratings are counted,
 * without any message text, in the review summary (/api/admin/review) for people
 * to read; any change they motivate is authored, then must pass the eval suite.
 */

export const MISS_REASONS = ["too_long", "too_short", "too_many_questions", "just_listen", "more_practical", "too_cheerful", "too_formal", "missed_point"] as const;
export type MissReason = (typeof MISS_REASONS)[number];

export interface ReplyFeedback {
  at: number;
  /** When the reply being rated was sent. */
  replyAt: number;
  verdict: "helped" | "missed";
  reason?: MissReason;
  /** Length of that reply in characters, so "helped" can teach length too. */
  replyLength?: number;
}

export function isMissReason(x: unknown): x is MissReason {
  return typeof x === "string" && (MISS_REASONS as readonly string[]).includes(x);
}
