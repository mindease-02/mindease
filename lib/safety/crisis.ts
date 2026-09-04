/**
 * Risk detection.
 *
 * Non-negotiable design constraints, in order:
 *
 *  1. This runs BEFORE the model call, deterministically, on every user turn. It
 *     is not a tool the model may choose to invoke and it cannot be suppressed by
 *     anything in the conversation. A language model's judgement about whether
 *     someone is in danger is a useful second opinion and an unacceptable single
 *     point of failure.
 *
 *  2. It is deliberately over-sensitive at the top tiers. The cost of showing a
 *     crisis-line card to someone who was quoting song lyrics is a mild
 *     annoyance. The cost of the other error is not comparable, and no amount of
 *     precision tuning makes those two errors trade off evenly.
 *
 *  3. At PLAN and above, the resource card renders regardless of what the model
 *     says, and is not dismissable by the same turn that triggered it.
 *
 *  4. This is a triage filter, not a clinical instrument, and nothing in this
 *     product is a substitute for care. The escalation copy says so plainly.
 *
 * Ordering matters: patterns are checked highest-tier first, and negation and
 * past-tense/recovery framing are checked before any positive match is accepted,
 * so "I used to think about killing myself, years ago" does not fire IMMINENT.
 */

export type RiskTier = "none" | "distress" | "passive" | "active" | "plan" | "imminent";

export const TIER_ORDER: RiskTier[] = ["none", "distress", "passive", "active", "plan", "imminent"];

export interface RiskAssessment {
  tier: RiskTier;
  /** 0..1 - how strongly the text matched. Not a probability of anything real. */
  strength: number;
  matched: string[];
  /** Must the resource card be shown, regardless of model output? */
  forceResources: boolean;
  /** Must the model be told to stop everything else and respond to this? */
  overrideConversation: boolean;
  /** True when a match was found but discounted (past tense, negated, third party). */
  discounted: boolean;
  discountReason?: string;
}

/** Contexts in which a match should not fire, checked before accepting one. */
const DISCOUNTERS: [RegExp, string][] = [
  [/\b(used to|years? ago|when i was|back then|in the past|as a (teen|kid|child))\b/i, "past tense"],
  [/\b(i'?m|i am|feeling|doing)\s+(so\s+)?much\s+better\b/i, "recovery framing"],
  [/\b(no longer|not any ?more|don'?t (feel|think) (that|like that) any ?more)\b/i, "explicitly resolved"],
  [/\b(my|a|his|her|their)\s+(friend|brother|sister|mum|mom|dad|colleague|patient|client)\b.{0,30}\b(killed|suicid|self.harm)/i, "third party"],
  [/\b(book|film|movie|documentary|podcast|song|lyrics?|character|article|essay|paper|study|novel|news|awareness|prevention)\b/i, "media reference"],
  [/\b(i'?m (writing|researching)|for (a |my |our )?(class|paper|story|project|school|uni|college|work))\b/i, "creative or academic context"],
];

/** Tier patterns, highest first. Weight is the match strength within the tier. */
const PATTERNS: [RiskTier, RegExp, number, string][] = [
  // IMMINENT - stated intent to act now, or an act in progress.
  ["imminent", /\b(i'?m|i am)\s+(going to|about to|gonna)\s+(kill myself|end (it|my life)|do it)\b/i, 1.0, "stated imminent intent"],
  ["imminent", /\b(i'?ve|i have)\s+(just\s+)?(taken|swallowed|cut|overdosed)\b/i, 1.0, "act in progress"],
  ["imminent", /\b(tonight|today|right now|in an hour)\b.{0,30}\b(end it|kill myself|not be here|do it)\b/i, 0.95, "imminent timeframe"],
  ["imminent", /\bgood ?bye\b.{0,40}\b(forever|for good|last (time|message))\b/i, 0.85, "farewell framing"],
  ["imminent", /\bthis is (my|the) last (message|time|night)\b/i, 0.85, "farewell framing"],

  // PLAN - method, means, preparation, or a specific time.
  ["plan", /\b(i (have|got)|i'?ve got)\s+(a|the)\s+(plan|pills|rope|gun|knife|blade)\b/i, 0.95, "stated means"],
  ["plan", /\b(how (much|many)|what dose)\b.{0,30}\b(would|to)\s+(kill|be (lethal|enough)|overdose)\b/i, 0.95, "lethality question"],
  ["plan", /\b(wrote|writing|written)\s+(a\s+)?(note|letter)\b.{0,25}\b(goodbye|for (them|him|her|everyone))\b/i, 0.9, "note"],
  ["plan", /\b(giving|gave)\s+away\s+my\s+(things|stuff|belongings)\b/i, 0.7, "putting affairs in order"],
  ["plan", /\bi'?ve\s+(decided|made up my mind)\b.{0,30}\b(end|kill|die)\b/i, 0.9, "decision stated"],

  // ACTIVE - wanting to die or to act, without stated plan.
  ["active", /\bi\s+(want|wanna|need)\s+to\s+(die|kill myself|end (it|my life)|not (be|exist))\b/i, 0.9, "active ideation"],
  ["active", /\bkill(ing)?\s+myself\b/i, 0.85, "active ideation"],
  ["active", /\b(end|ending)\s+(it all|my life)\b/i, 0.85, "active ideation"],
  ["active", /\b(think|thinking|thought)\s+about\s+(ending (it|things|everything)|suicide|killing myself|not being (here|around|alive))\b/i, 0.75, "ideation"],
  ["active", /\b(suicidal|suicide)\b/i, 0.7, "explicit mention"],
  // Internet euphemisms. Casual spelling does not make them casual.
  ["active", /\b(unalive|un-alive)\s+(myself|me)\b|\bkms\b|\bsewerslide\b|\b(delete|off|end)\s+myself\b|\b(want|wanna|going|gonna)\s+(to\s+)?unalive\b/i, 0.8, "suicide euphemism"],
  ["active", /\b(won'?t|not gonna|not going to)\s+be\s+(here|around)\s+(much longer|for long|anymore)\b/i, 0.7, "euphemism for not being here"],
  ["passive", /\b(done|finished)\s+with\s+(life|living|everything|it all)\b/i, 0.5, "done with life"],
  ["active", /\bi\s+(want|need)\s+to\s+(hurt|cut)\s+myself\b/i, 0.8, "self-harm urge"],
  ["active", /\b(self.harm|self.harming|cutting myself)\b/i, 0.7, "self-harm"],

  // PASSIVE - wishing not to exist, without intent to act.
  ["passive", /\bi\s+wish\s+i\s+(was|were)\s+(dead|never born|not here)\b/i, 0.8, "passive ideation"],
  ["passive", /\b(don'?t|do not)\s+want\s+to\s+(be here|wake up|exist|go on)\b/i, 0.75, "passive ideation"],
  ["passive", /\b(everyone|they'?d|people)\s+(would\s+be|are)\s+better\s+off\s+without\s+me\b/i, 0.85, "burdensomeness"],
  ["passive", /\bwhat'?s\s+the\s+point\s+of\s+(living|going on|any of (it|this))\b/i, 0.6, "hopelessness"],
  ["passive", /\bi'?m\s+(a\s+)?burden\b/i, 0.6, "burdensomeness"],
  ["passive", /\bif\s+i\s+(just\s+)?(didn'?t|did not)\s+wake\s+up\b/i, 0.75, "passive ideation"],

  // DISTRESS - acute suffering without ideation. Not a crisis; still worth noticing.
  ["distress", /\bi\s+(can'?t|cannot)\s+(do this|take (it|this)|cope|go on)\s*(any ?more)?\b/i, 0.6, "at capacity"],
  ["distress", /\b(everything|it all)\s+(is|feels)\s+(too much|pointless|hopeless)\b/i, 0.55, "overwhelm"],
  ["distress", /\bi'?m\s+(falling apart|breaking down|drowning|losing it)\b/i, 0.55, "acute distress"],
  ["distress", /\bpanic\s+attack\b/i, 0.5, "panic"],
  ["distress", /\b(i\s+)?(have|haven'?t|hasn'?t|not)\s+(not\s+)?(slept|eaten)\s+(properly\s+)?(in|for|since)\s+\w+(\s+days?)?\b/i, 0.5, "basic needs unmet"],
];

export function assessRisk(text: string): RiskAssessment {
  const discountHits = DISCOUNTERS.filter(([re]) => re.test(text));
  // "I don't want to die" negates intent; "I don't want to wake up" IS the ideation.
  const negatedRecently = /\b(not|never|don'?t|doesn'?t|wouldn'?t|no)\s+(going to|gonna|want to)\b(?!\s+(be here|wake up|exist|go on|live|be alive|be around))/i.test(text);

  let best: { tier: RiskTier; weight: number; label: string } | null = null;
  const matched: string[] = [];

  for (const [tier, re, weight, label] of PATTERNS) {
    if (!re.test(text)) continue;
    matched.push(label);
    if (!best || TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(best.tier)) {
      best = { tier, weight, label };
    }
  }

  if (!best) {
    return {
      tier: "none", strength: 0, matched: [],
      forceResources: false, overrideConversation: false, discounted: false,
    };
  }

  let tier = best.tier;
  let strength = best.weight;
  let discounted = false;
  let discountReason: string | undefined;

  if (discountHits.length || negatedRecently) {
    discountReason = negatedRecently ? "negated" : discountHits[0][1];
    discounted = true;
    // Step down at most one tier, and never below `distress` once anything in the
    // ideation families matched. Someone raising this "about a friend" or "years
    // ago" is very often raising it about themselves, and a discounter is a reason
    // to soften the interface, not to stop paying attention.
    const idx = TIER_ORDER.indexOf(tier);
    if (idx > 1) tier = TIER_ORDER[idx - 1];
    strength *= 0.6;
  }

  const idx = TIER_ORDER.indexOf(tier);
  return {
    tier,
    strength,
    matched,
    forceResources: idx >= TIER_ORDER.indexOf("active"),
    overrideConversation: idx >= TIER_ORDER.indexOf("plan"),
    discounted,
    discountReason,
  };
}

/** Highest tier seen across a window - one calm message does not clear a crisis. */
export function peakRisk(assessments: RiskAssessment[]): RiskTier {
  let peak: RiskTier = "none";
  for (const a of assessments) {
    if (TIER_ORDER.indexOf(a.tier) > TIER_ORDER.indexOf(peak)) peak = a.tier;
  }
  return peak;
}

export function atLeast(tier: RiskTier, min: RiskTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}
