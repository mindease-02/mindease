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
import { normalizeQuotes } from "../util/text";

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
  // Indirect warning signs: putting affairs in order, goodbyes, "where I'm going".
  ["active", /\b(giving|gave|given)\s+(away\s+)?(all\s+)?(my|some of my)\s+(things|stuff|belongings|possessions)(\s+away)?\b/i, 0.7, "giving possessions away"],
  ["active", /\b(won'?t|wont|will not|don'?t)\s+need\s+(them|it|any of (it|this|them)|these)\s+(where i'?m going|anymore where|after (tonight|this|tomorrow))\b/i, 0.85, "won't need things where they're going"],
  ["active", /\bwhere\s+i'?m\s+going,?\s+(i\s+)?(won'?t|wont|don'?t)\s+need\s+(them|it|anything|any of)\b/i, 0.85, "won't need things where they're going"],
  ["active", /\b(won'?t|wont)\s+be\s+(a\s+)?(problem|burden)\s+(much\s+longer|for\s+long|anymore|soon)\b/i, 0.8, "won't be a problem much longer"],
  ["active", /\b(this is|consider this( my)?|saying)\s+(my\s+)?goodbye\b[^.?!]{0,30}\b(everyone|all of you|forever|for good)\b|\bwriting\s+(goodbye|farewell)\s+(letters|notes|messages)\b/i, 0.8, "goodbye messages"],
  ["active", /\b(found|have|got)\s+a\s+way\s+out\b[^.?!]{0,30}\b(for good|of (this|everything|it all)|permanently)\b/i, 0.75, "found a way out"],
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

  // Tamil and Hindi, script and common romanisations. Word boundaries do not apply to these scripts, so the
  // phrases are specific on purpose; the model's second opinion covers what a list cannot.
  // Tamil script.
  ["plan", /மாத்திரை.{0,20}(சேர்த்து|சேகரி|சேத்து)|(இன்னைக்கு|இன்னிக்கு|இன்று|இன்னைக்கி) ?(ராத்திரி|இரவு|நைட்).{0,20}(முடிஞ்சிடும்|முடிந்துவிடும்|முடியும்|முடிஞ்சிரும்)/u, 0.9, "means or a time (Tamil)"],
  ["active", /தற்கொலை|செத்து ?விடலாம்|செத்துடலாம்|சாக ?(வேணும்|வேண்டும்|ணும்)|உயிரை ?மாய்த்து|என்னை ?(முடிச்சு|முடித்து)க்|எல்லாத்தையும் ?முடி(ச்சு|த்து)க்?(கலாம்|கிடலாம்)|எல்லாம் ?முடிச்சுக்கலாம்/u, 0.85, "active ideation (Tamil)"],
  ["passive", /வாழ ?(விருப்பம் ?இல்லை|வேண்டாம்|ணும்னு ?தோணல|பிடிக்கல)|இருக்கவே ?வேண்டாம்|நான் ?இல்லாம ?இருந்தா|எல்லாம் ?வீண்|யாருக்கும் ?தேவை ?இல்ல|நான் ?(ஒரு ?)?(பாரம்|சுமை)/u, 0.7, "passive ideation (Tamil)"],
  // Tanglish (Tamil in Latin letters). Spellings vary, so the stems are loose on purpose.
  ["plan", /\bma[at]h?t?h?irai\w*.{0,14}(serthu|sethu ?vach|sekar)|\b(innai?kk?u|innikk?u|inniki|today|tonight) ?(night|raa?thiri|ravu)?[^.?!]{0,20}\bellam ?mudinj/i, 0.9, "means or a time (Tanglish)"],
  ["active", /\b(tharkolai|saaganum|sethudalam|sethu ?dalam|uyira ?mai|ella(th|dh)\w* ?mudi(chu|chi|chi)\w* ?(nu|n) ?(irukku|iruku|thonuthu|thonudhu|thonum))/i, 0.8, "active ideation (Tanglish)"],
  ["passive", /\b(vaazha? ?(virupam ?illa|vendam|pidikk?ala|pidikk?alai)|irukave ?vendam|naan? ?illa(ma|mal|mai) ?irundha|naan? ?(oru ?)?(bharam|baaram|paaram|sumai)|ya+ru?kk?um ?(thevai|theva) ?illa)/i, 0.65, "passive ideation (Tanglish)"],
  // Hindi script.
  ["plan", /(गोलियाँ|गोलियां|गोलियों|गोली|दवाइयाँ|दवाइयां|दवाई|दवा).{0,16}(इकट्ठ|इकठ्ठ|जमा)|आज ?रात.{0,16}(खत्म|ख़त्म) ?कर ?(दूँगा|दूंगा|दूँगी|दूंगी|लूँगा|लूंगा|लूँगी|लूंगी)/u, 0.9, "means or a time (Hindi)"],
  ["active", /आत्महत्या|मरना ?चाहत|मर ?जाना ?चाहत|खुद ?को ?(खत्म|ख़त्म|मार)|जान ?दे ?द(ूँ|ूं|ो)|ज़िंदगी ?खत्म ?कर|सब ?(कुछ ?)?(खत्म|ख़त्म) ?कर ?(दूँगा|दूंगा|दूँगी|दूंगी|लूँगा|लूंगा|लूँगी|लूंगी)|मैं ?(अब|कल ?से) ?नहीं ?रह(ूँगा|ूंगा|ूँगी|ूंगी)|(अब|कल ?से) ?मैं ?नहीं ?रह(ूँगा|ूंगा|ूँगी|ूंगी)/u, 0.85, "active ideation (Hindi)"],
  ["passive", /जीना ?नहीं ?चाहत|जीने ?का ?मन ?नहीं|काश ?मैं ?(मर|न ?होत)|पैदा ?(ही ?)?(न|ना|नहीं) ?हु(आ|ई) ?होत|मैं ?न ?रह(ूँ|ूं)|सब ?बेकार ?है|मेरे ?बिना ?(सब ?)?(बेहतर|अच्छ|खुश)|(सब|सबको|लोग) ?मेरे ?बिना|बोझ ?(हूँ|हूं)|मैं ?(एक ?)?बोझ/u, 0.7, "passive ideation (Hindi)"],
  // Hinglish (Hindi in Latin letters).
  ["plan", /\b(goliy(an|aan|on)|goli|dawai(yan|yaan)?|tablets?|pills)\b.{0,16}(ikatth|ikath|jama|collect)|\b(aaj ?raat|tonight)\b[^.?!]{0,16}\bkhat?am ?kar ?(d|l)(unga|ungi|oonga|oongi)|\bkhat?am ?kar ?(d|l)(unga|ungi|oonga|oongi)\b[^.?!]{0,16}\b(tonight|aaj ?raat)\b/i, 0.9, "means or a time (Hinglish)"],
  ["active", /\b(marna ?chaht|mar ?jana ?chaht|khud ?ko ?khat?am|jaan ?de ?d(u|oon)|sab ?(kuch ?)?khat?am ?kar ?(d|l)(unga|ungi|oonga|oongi)|(main|mai|mein) ?(ab|kal ?se) ?nah?i ?rah(unga|ungi|oonga|oongi)|(ab|kal ?se) ?(main|mai|mein) ?nah?i ?rah(unga|ungi|oonga|oongi))/i, 0.8, "active ideation (Hinglish)"],
  ["passive", /\b(jeena ?nah?i ?chaht|jeene ?ka ?mann? ?nah?i|kaash? ?(main|mai|mein) ?paida ?(hi ?)?(na|nah?i|nhi) ?hu(a|i)|mere ?bina ?(sab ?)?(better|behtar|khush|acch)|(sab|sabko|log) ?mere ?bina|(main|mai|mein) ?(sab ?ke ?liye ?|sabke ?liye ?|sab ?pe ?|sab ?par ?)?(ek ?)?bojh|bojh ?(hoon|hun|hu))/i, 0.65, "passive ideation (Hinglish)"],
  // Telugu, Kannada and Malayalam: the plainest phrasings only; the model's second opinion covers the rest.
  ["active", /ఆత్మహత్య|చనిపోవాలని|చచ్చిపోవాలని|ಆತ್ಮಹತ್ಯೆ|ಸಾಯಬೇಕು|ಸಾಯಬೇಕೆಂದು|ആത്മഹത്യ|മരിക്കണം|മരിക്കാൻ ?തോന്ന/u, 0.85, "active ideation (Telugu, Kannada or Malayalam)"],
  ["passive", /బతకాలని ?లేదు|జీవించాలని ?లేదు|ಬದುಕಲು ?ಇಷ್ಟವಿಲ್ಲ|ಬದುಕೋಕೆ ?ಇಷ್ಟ ?ಇಲ್ಲ|ജീവിക്കാൻ ?തോന്നുന്നില്ല|ജീവിക്കണ്ട/u, 0.7, "passive ideation (Telugu, Kannada or Malayalam)"],
  ["distress", /\b(i\s+)?(have|haven'?t|hasn'?t|not)\s+(not\s+)?(slept|eaten)\s+(properly\s+)?(in|for|since)\s+\w+(\s+days?)?\b/i, 0.5, "basic needs unmet"],
];

export function assessRisk(input: string): RiskAssessment {
  const text = normalizeQuotes(input);
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
