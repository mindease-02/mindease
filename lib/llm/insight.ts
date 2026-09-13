/**
 * Insight milestones: did the person, in this message, do something with a
 * thought themselves? Reframe it, name what helps, notice a pattern, or
 * commit to a concrete step.
 *
 * This is its own small call because folding it into the affect analysis
 * made the model skip it almost every time. A cheap cue filter runs first,
 * so most messages never reach the model at all: the check costs nothing on
 * "lol ok" and on plain venting, and the milestone stays rare by design.
 */
import { complete, parseJsonObject, llmConfig } from "./index";
import { normalizeQuotes } from "../util/text";

export type InsightKind = "reframe" | "named_help" | "noticed" | "plan";
export interface Insight { kind: InsightKind; text: string }

/** Latin-script cue words. Non-Latin scripts skip the filter (cue lists there would miss too much) but need some length. */
const CUES = /\b(actually|maybe|probably|not about me|not (the|my) fault|other way|to be fair|in hindsight|that's not nothing|helps?|helped|calms?|calmed|keeps? me|makes? me feel better|works for me|noticed|notice|realis|realiz|every time|whenever|always (do|get)|pattern|i'?m going to|gonna|i'?ll|i will|tomorrow|tonight|this week|plan to|decided|book|call|text|email|ask)\b/i;
const NON_LATIN = /[ऀ-෿]/;
const HELPS = /\b(helps?|helped|calms? me|keeps? me (sane|going|steady|grounded)|works for me|makes? me feel better)\b/i;
/** A "plan" has to sound like one: a future step in the quoted words. Otherwise it is kept as something they noticed. */
const FUTURE = /\b(i'?ll|i will|i'?m going to|gonna|going to|tomorrow|tonight|this (week|weekend|evening)|next|plan to|decided to|book|call|text|email|ask|start)\b/i;

export function worthChecking(text: string): boolean {
  const t = normalizeQuotes(text).trim();
  if (t.length < 12) return false;
  if (NON_LATIN.test(t)) return t.length >= 16;
  return CUES.test(t);
}

const SYSTEM = `You decide whether ONE message shows the person doing one of four things themselves. Reply with JSON only.

{"kind": "reframe" | "named_help" | "noticed" | "plan" | "none", "text": string}

- reframe: they look at a thought again and see it a different, kinder or more accurate way.
- named_help: they say something specific helps them, calms them, or keeps them steady.
- noticed: they spot a pattern or trigger in their own behaviour or feelings.
- plan: they commit to a concrete real-world step, ideally with a when.
- none: anything else. Venting, feeling bad, asking for help, greetings, praise for the app, and time spent talking are all none.

"text" is the shortest span of their own words that shows it, under 80 characters, in the language they wrote. Use "" for none.
Judge only this message. When unsure, answer none.`;

export async function detectInsight(text: string): Promise<Insight | null> {
  if (!llmConfig() || !worthChecking(text)) return null;
  try {
    const raw = await complete(
      [{ role: "system", content: SYSTEM }, { role: "user", content: `"""${text.slice(0, 600)}"""` }],
      { tier: "fast", json: true, temperature: 0, maxTokens: 300 },
    );
    const j = parseJsonObject<{ kind?: string; text?: string }>(raw);
    const kind = ["reframe", "named_help", "noticed", "plan"].includes(String(j?.kind)) ? (j!.kind as InsightKind) : null;
    const span = typeof j?.text === "string" ? j.text.trim().slice(0, 100) : "";
    if (!kind || !span) return null;
    if (!NON_LATIN.test(span)) {
      // The small model often files "X helps" under noticed; the words themselves settle it.
      if (kind !== "named_help" && kind !== "reframe" && HELPS.test(span) && !FUTURE.test(span)) return { kind: "named_help", text: span };
      if (kind === "plan" && !FUTURE.test(span)) return { kind: "noticed", text: span };
    }
    return { kind, text: span };
  } catch {
    return null;
  }
}
