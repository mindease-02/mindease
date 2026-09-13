/**
 * The person's corrections to the emotion read, and what they change.
 *
 * When someone says "not sad, frustrated", two things happen: the next reply
 * says plainly that the read was off, and later replies get the correction as
 * context, the way a memory is. Reads are never adjusted automatically: that
 * would be the system rewriting itself from live feedback, which MindEase does
 * not do (docs/mindease-system-prompt.md, "Hard line"). Corrections are counted,
 * without message text, in the review summary so people can improve the analyser.
 */
import type { Octant } from "../affect/octant";

export const AXES = ["joy", "trust", "fear", "surprise", "sadness", "disgust", "anger", "anticipation"] as const;
export type Axis = (typeof AXES)[number];

export interface ReadCorrection {
  at: number;
  /** When the message whose read was corrected was answered. */
  messageAt: number;
  said: Axis;
  meant: Axis;
  acknowledged?: boolean;
}

/** Plain words the prompt and the chooser use for each axis. */
export const AXIS_WORDS: Record<Axis, string> = {
  joy: "happy", trust: "at ease", fear: "worried or afraid", surprise: "caught off guard",
  sadness: "sad", disgust: "put off or repelled", anger: "angry or frustrated", anticipation: "looking ahead, keyed up",
};

export function isAxis(x: unknown): x is Axis {
  return typeof x === "string" && (AXES as readonly string[]).includes(x);
}

export function topAxes(axes: Octant, n = 3): { axis: Axis; value: number }[] {
  return AXES.map((axis) => ({ axis, value: axes[axis] })).sort((a, b) => b.value - a.value).slice(0, n);
}

export function confidenceBand(c: number): "high" | "some" | "low" {
  return c >= 0.7 ? "high" : c >= 0.45 ? "some" : "low";
}
