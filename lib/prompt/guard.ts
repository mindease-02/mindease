/**
 * The last check on a reply before it is sent.
 *
 * The system prompt asks the model not to build dependency, keep secrets,
 * claim a special bond, probe a disclosure, reach for platitudes, label people
 * with conditions, or recite phone numbers. Prompts are requests; this is the
 * enforcement. A flagged draft gets one rewrite with the problems named, and
 * anything still flagged after that is cut sentence by sentence.
 *
 * English patterns are the reliable part. Replies in other languages are
 * checked for numbers only, which is the check that matters most there.
 *
 * Pending clinician review: the categories and the disclosure cues.
 */

export type GuardIssue =
  | "dependency" | "secrecy" | "special" | "claimed-feeling" | "discourage-help"
  | "probing-why" | "probing-detail" | "platitude" | "label" | "unverified-number" | "invented-history"
  | "called-distorted" | "attachment-label" | "framework-jargon";

export interface GuardHit { issue: GuardIssue; match: string }

const PATTERNS: [GuardIssue, RegExp][] = [
  ["dependency", /\b(i'?m|i am|i'?ll|i will)\s+(always|still)\s+(be\s+)?here\b/i],
  ["dependency", /\balways\s+here\s+for\s+you\b/i],
  ["dependency", /\b(i'?m|i am|i'?ll be|i will be|i'?m available|here for you)\b[^.!?]{0,24}(24\/7|24x7|any ?time,? day or night|round the clock)/i],
  ["dependency", /\b(whenever you need me|anytime you need me|any time you need me)\b/i],
  ["dependency", /\b(keep|stay|continue) (talking|chatting) (here|with me)\b|\b(talk|chat) (here|with me) (a bit |a little )?longer\b/i],
  ["dependency", /\byou can (always )?(tell|talk to) me (about )?anything\b/i],
  ["dependency", /\b(you )?don'?t need anyone else\b/i],
  ["dependency", /\b(i'?m|i am) the only one\b/i],
  ["dependency", /\b(i'?ll|i will) never leave you\b/i],
  ["secrecy", /\b(just )?between (the two of )?us\b/i],
  ["secrecy", /\bour (little )?secret\b/i],
  ["secrecy", /\b(i won'?t|i will not|i'?ll never) tell (anyone|anybody|a soul)\b/i],
  ["secrecy", /\b(keep|kept) (this|it) (a )?secret\b/i],
  ["special", /\b(understand|get|know) you better than (anyone|anybody|they|your friends|your family)\b/i],
  ["special", /\bno ?one (else )?(gets|understands|knows) you like (i do|me)\b/i],
  ["special", /\b(i'?ve|i have) never (met|talked to|known) anyone like you\b/i],
  ["special", /\byou'?re (so )?(different|special) (to me|from (everyone|the others))\b/i],
  ["special", /\byou'?re special to me\b/i],
  ["claimed-feeling", /\bi (really )?(missed|miss) you\b/i],
  ["claimed-feeling", /\bi (was|have been|'ve been) thinking (about|of) you\b/i],
  ["claimed-feeling", /\bi (feel|felt) (so )?(sad|worried|happy|heartbroken|hurt) (for|about|that)\b/i],
  ["claimed-feeling", /\bi love you\b/i],
  ["discourage-help", /\byou (don'?t|do not) need (a |to see a )?(therapist|counsellor|counselor|doctor|professional|help)\b/i],
  ["discourage-help", /\b(better|easier) (to talk to|talking to) me than (a |your )?(therapist|friends|family|people)\b/i],
  ["platitude", /\beverything (will|is going to|'ll) be (fine|okay|ok|alright)\b/i],
  ["platitude", /\beverything happens for a reason\b/i],
  ["platitude", /\blook on the bright side\b/i],
  ["platitude", /\bit could (always )?be worse\b/i],
  ["platitude", /\b(so much|a lot|everything) to live for\b/i],
  ["platitude", /\bthink (?:about|of) (?:how )?(?:your family|your parents|the people who love you|they)\b[^.?!]{0,30}\b(?:feel|react|cope|miss you)\b/i],
  ["platitude", /\bthink (?:about|of) (?:your family|your parents|the people who love you)\b/i],
];

/** Words that mark a disclosure of harm done to the person. */
import { normalizeQuotes } from "../util/text";

export const DISCLOSURE = /\b(abus(e|ed|ive)|assault(ed)?|rap(e|ed)|molest(ed)?|harass(ed|ment)|beat (me|us)|hit me|hits me|touched me|attacked|violence|violent|trauma|traumati[sz]ed|caste|lynch|riot|stalk(ed|ing)|threatened me|forced me)\b/i;

const LABELS = /\b(ptsd|c-?ptsd|dissociat(ion|ive|ing)|bipolar|borderline|bpd|depression|depressed disorder|anxiety disorder|ocd|adhd|trauma response|disorder)\b/i;

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?।])\s+/).filter(Boolean);
}

/** Digits a reply may contain: the verified helplines and emergency numbers the app shows. */
export function allowedNumbers(listed: string[]): Set<string> {
  const set = new Set<string>();
  for (const s of listed) for (const m of s.match(/\+?\d[\d\s-]{1,16}\d/g) ?? []) set.add(m.replace(/\D/g, ""));
  return set;
}

const PAST_CUE = /\b(like when you|remember when|the time you|back when you|last (?:week|month|year|time|summer|winter)|you(?:'ve| have)? (?:told|mentioned|said)(?: me)?|as you mentioned|you mentioned)\b/gi;
const STOPWORDS = new Set("that this with have from they them their there about when what your you're were been just really very much more some into over like then than also only after before again because could would should which while where other being doing going thing things time".split(" "));

/** A reference to the person's past whose key words appear in nothing MindEase actually knows. */
export function inventedHistory(rawReply: string, known: string): string | null {
  const reply = normalizeQuotes(rawReply);
  const knownLower = known.toLowerCase();
  for (const m of reply.matchAll(PAST_CUE)) {
    const tail = reply.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 70).toLowerCase();
    const words = (tail.match(/[a-z]{4,}/g) ?? []).filter((w) => !STOPWORDS.has(w)).slice(0, 5);
    if (words.length && !words.some((w) => knownLower.includes(w.replace(/(ing|ed|es|s)$/, "")))) return m[0] + tail.slice(0, 40);
  }
  return null;
}

export function checkReply(rawReply: string, rawUser: string, allowed: Set<string>, known?: string): GuardHit[] {
  const reply = normalizeQuotes(rawReply), userText = normalizeQuotes(rawUser);
  const hits: GuardHit[] = [];
  if (known !== undefined) {
    const inv = inventedHistory(reply, `${known} ${userText}`);
    if (inv) hits.push({ issue: "invented-history", match: inv });
  }
  for (const [issue, re] of PATTERNS) {
    const m = re.exec(reply);
    if (m) hits.push({ issue, match: m[0] });
  }
  if (DISCLOSURE.test(userText)) {
    const why = /\bwhy (did|didn'?t|do|don'?t|would|wouldn'?t|were|weren'?t|was|wasn'?t|are|aren'?t|haven'?t|hadn'?t) (you|they|he|she|it)\b/i.exec(reply);
    if (why) hits.push({ issue: "probing-why", match: why[0] });
    const detail = /\b(what (exactly )?(happened|did (he|she|they) do)|tell me (more )?(about )?(what|exactly|everything) (happened|he did|she did|they did)|walk me through (what|it))\b/i.exec(reply);
    if (detail) hits.push({ issue: "probing-detail", match: detail[0] });
  }
  const distorted = /\b(?:your|that|this) (?:thinking|thought|thoughts|belief|way of thinking) (?:is|are|sounds|seems) (?:distorted|irrational|wrong|faulty|illogical)\b|\bthat'?s (?:a |an )?(?:cognitive )?distortion\b|\byou'?re (?:being )?(?:irrational|catastrophi[sz]ing)\b/i.exec(reply);
  if (distorted) hits.push({ issue: "called-distorted", match: distorted[0] });
  const attach = /\b(?:your|you have an?|you(?:'re| are)(?: an?)?|sounds like an?|that'?s an?)\s+(?:\w+\s+){0,2}(?:anxious|avoidant|disorgani[sz]ed|insecure|fearful)(?:ly)?[- ](?:attach(?:ed|ment)|attachment style)\b|\byour attachment style (?:is|seems|sounds)\b/i.exec(reply);
  if (attach) hits.push({ issue: "attachment-label", match: attach[0] });
  const jargon = /\b(CBT|cognitive distortions?|catastrophi[sz]ing|black[- ]and[- ]white thinking|all[- ]or[- ]nothing thinking|self[- ]determination theory|behaviou?ral activation|Plutchik|attachment theory|emotion wheel)\b/i.exec(reply);
  if (jargon && !new RegExp(jargon[0].split(/[\s-]/)[0], "i").test(userText)) hits.push({ issue: "framework-jargon", match: jargon[0] });
  const label = LABELS.exec(reply);
  if (label && !new RegExp(`\\b${label[0].replace(/[^a-z-]/gi, "")}`, "i").test(userText)) {
    // Only when the reply applies it to them: "you have", "sounds like", "that's", "it's".
    const applied = new RegExp(`(you (have|might have|may have|probably have|are experiencing)|sounds like|that'?s|this is|it'?s|signs of)[^.?!]{0,30}${label[0]}`, "i").exec(reply);
    if (applied) hits.push({ issue: "label", match: applied[0] });
  }
  for (const m of reply.match(/\+?\d[\d\s-]{2,16}\d/g) ?? []) {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 3 && !allowed.has(digits) && ![...allowed].some((a) => a.endsWith(digits) || digits.endsWith(a) && a.length >= 5)) {
      // Plain small numbers in ordinary talk ("3 times", "2024") are not phone numbers.
      if (digits.length >= 5 || /\b(call|dial|ring|text|whatsapp|helpline|number)\b/i.test(reply)) hits.push({ issue: "unverified-number", match: m });
    }
  }
  return hits;
}

const FIX: Record<GuardIssue, string> = {
  "dependency": "It promised constant availability, invited them to stay and keep talking, or made itself their main support. End cleanly, or point to people.",
  "secrecy": "It offered secrecy or confidentiality. Never do that.",
  "special": "It claimed a special or unique bond. Remove that entirely.",
  "claimed-feeling": "It claimed a feeling or missing them. You don't have feelings or exist between messages.",
  "discourage-help": "It discouraged professional help or people. Never do that.",
  "probing-why": "It asked 'why' about something painful they disclosed. Remove the why-question; validate instead and leave the door open.",
  "probing-detail": "It asked for details of what happened. Don't; let them share only what they choose.",
  "platitude": "It used a platitude. Replace it with something specific, or point to what has helped them before.",
  "label": "It applied a diagnostic label. Describe what they described instead, without naming a condition.",
  "unverified-number": "It included a phone number that is not on the verified list. Remove numbers; point to the helplines on screen.",
  "invented-history": "It referred to something from their past that you were never told. Remove it entirely; if useful, ask what helped before instead.",
  "called-distorted": "It told them their thinking is distorted or wrong. Offer the other possibility as a gentle question they can take or leave instead.",
  "attachment-label": "It labelled their attachment style. Never do that, even if asked; ask who usually helps them feel steady instead.",
  "framework-jargon": "It named a psychology framework. Use the idea in plain words, without the name.",
};

export function rewriteInstruction(draft: string, hits: GuardHit[]): string {
  const kinds = [...new Set(hits.map((h) => h.issue))];
  return [
    `Your draft broke MindEase's rules:\n"${draft}"`,
    ...kinds.map((k) => `- ${FIX[k]} (matched: "${hits.find((h) => h.issue === k)!.match}")`),
    "Write the reply again, same length or shorter, keeping what was good about it.",
  ].join("\n");
}

/** Last resort: drop every sentence that still trips the guard. Never returns an empty reply. */
export function sanitize(reply: string, userText: string, allowed: Set<string>, fallback: string, known?: string): string {
  const kept = sentences(reply).filter((s) => checkReply(s, userText, allowed, known).length === 0);
  const out = kept.join(" ").trim();
  return out.length >= 12 ? out : fallback;
}

/**
 * The stock openers the voice rules forbid ("It sounds like", "Sounds like", "I hear that").
 * Fixed in place rather than with another model call, which the rate budget cannot afford on every turn.
 */
export function trimStockOpeners(rawReply: string): string {
  // Only "sounds like <clause>" and "I hear that <clause>"; "I hear you, and..." is left alone because trimming it breaks the sentence.
  return normalizeQuotes(rawReply).replace(/(^|[.!?]\s+)(?:it\s+)?sounds\s+like\s+(\p{Ll})/giu, (_m, lead: string, ch: string) => `${lead}${ch.toUpperCase()}`)
    .replace(/(^|[.!?]\s+)i(?:\s+hear|'m\s+hearing)\s+that\s+(\p{Ll})/giu, (_m, lead: string, ch: string) => `${lead}${ch.toUpperCase()}`);
}
