/**
 * Reminiscence.
 *
 * Reminiscence therapy - structured recall of past experience - has a decent
 * evidence base for mood and self-esteem, particularly in older and isolated
 * people, and its active ingredient is narrative identity: telling the story of
 * who you have been makes the present feel like a chapter rather than the whole
 * book. A companion is well placed to do this because it can remember what you
 * told it last month and ask the next question.
 *
 * It is a move, not a mode. The prompt gets one optional suggestion per turn,
 * and only when the state is right for it: low-to-moderate mood, no acute risk,
 * not mid-crisis, not when they asked for something concrete.
 */
import type { MemoryItem } from "./index";
import { DAY } from "../util/time";

const OPENERS = [
  "Ask about a place they felt at ease when they were younger - a room, a garden, a street - and what it was like to be there.",
  "Ask who they were closest to as a child, and what that person was like.",
  "Ask about something they were good at, or absorbed in, before adulthood filled the time.",
  "Ask about a small ritual from an earlier part of their life - a Sunday habit, a walk, a meal - that they have not done in a while.",
  "Ask about a time they got through something they did not think they would, and what got them through it.",
  "Ask about music or a song that belongs to a specific year of their life.",
  "Ask what they wanted to be, at twelve, and what of that is still in them.",
];

export interface ReminiscenceMove {
  kind: "followup" | "opener";
  instruction: string;
  memoryId?: string;
}

export function pickReminiscence(
  memories: MemoryItem[],
  ctx: { valence: number; riskTier: string; need: string; turnsThisSession: number },
  now = Date.now(),
): ReminiscenceMove | null {
  if (ctx.riskTier !== "none" && ctx.riskTier !== "distress") return null;
  if (ctx.need === "solve" || ctx.need === "vent") return null;
  if (ctx.valence < -0.6 || ctx.valence > 0.5) return null;
  if (ctx.turnsThisSession < 2) return null;

  // Prefer following a thread they already opened - a past memory not raised recently.
  const past = memories
    .filter((m) => m.kind === "past" && now - m.lastRecalledAt > 5 * DAY)
    .sort((a, b) => b.importance - a.importance || a.recallCount - b.recallCount);
  if (past.length) {
    const m = past[0];
    return {
      kind: "followup",
      memoryId: m.id,
      instruction: `They once told you: "${m.text}". If it fits, ask one specific, curious question that goes a step further into that - who else was there, what it looked like, what came next. Do not summarise it back to them.`,
    };
  }

  // Otherwise one opener, chosen by day so it rotates without repeating in-session.
  const idx = Math.floor(now / DAY) % OPENERS.length;
  return { kind: "opener", instruction: OPENERS[idx] };
}
