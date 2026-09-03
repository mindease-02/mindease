/**
 * Word lists for the psycholinguistic marker channel, plus a small hand-checked
 * VAD lexicon used as a graceful fallback when models/ has not been built yet.
 *
 * The marker categories are the ones with the strongest replication record in the
 * depression-language literature. They are NOT a diagnostic instrument and are
 * never presented to the user as one - they are inputs to a trend detector.
 */

export const MARKER_SETS = {
  firstPersonSingular: new Set(["i", "me", "my", "mine", "myself", "im", "ive", "id", "ill"]),
  firstPersonPlural: new Set(["we", "us", "our", "ours", "ourselves"]),
  /** Al-Mosaiwi & Johnstone (2018): absolutist words outperform negative-affect
   *  words at separating depression/anxiety/suicidal-ideation forums from controls. */
  absolutist: new Set([
    "absolutely", "all", "always", "complete", "completely", "constant", "constantly",
    "definitely", "entire", "ever", "every", "everyone", "everything", "full",
    "must", "never", "nothing", "nobody", "none", "totally", "whole", "anymore",
  ]),
  obligation: new Set(["should", "must", "ought", "supposed", "need", "have", "gotta", "shouldve"]),
  past: new Set([
    "was", "were", "had", "did", "used", "ago", "yesterday", "before", "once",
    "then", "back", "remember", "remembered",
  ]),
  future: new Set([
    "will", "shall", "going", "gonna", "tomorrow", "soon", "later", "next",
    "plan", "planning", "hope", "hoping", "someday", "eventually",
  ]),
  negation: new Set([
    "not", "no", "never", "cant", "wont", "dont", "doesnt", "didnt", "isnt",
    "arent", "wasnt", "nothing", "nobody", "none", "neither", "nor", "without",
  ]),
  cognitiveProcess: new Set([
    "because", "cause", "realise", "realize", "realised", "realized", "think",
    "thought", "know", "understand", "understood", "consider", "maybe", "perhaps",
    "reason", "why", "wonder", "figure", "suppose", "guess",
  ]),
  socialReference: new Set([
    "friend", "friends", "family", "mum", "mom", "dad", "mother", "father",
    "sister", "brother", "partner", "wife", "husband", "girlfriend", "boyfriend",
    "colleague", "coworker", "they", "them", "their", "she", "he", "her", "him",
    "someone", "people", "together", "call", "met", "meeting", "therapist", "doctor",
  ]),
} as const;

/**
 * Fallback VAD lexicon. Values are approximations of NRC-VAD / Warriner norms
 * rescaled to [-1, 1]. The trained model supersedes this entirely; this exists so
 * the app is functional and honest before `make train` has ever run.
 */
export const VAD_LEXICON: Record<string, [number, number, number]> = {
  // strongly negative, low arousal - the anhedonic / withdrawn cluster
  empty: [-0.72, -0.55, -0.60], numb: [-0.65, -0.78, -0.62], hollow: [-0.70, -0.58, -0.58],
  tired: [-0.42, -0.70, -0.35], exhausted: [-0.62, -0.65, -0.55], drained: [-0.62, -0.68, -0.55],
  lonely: [-0.78, -0.35, -0.60], alone: [-0.55, -0.30, -0.45], isolated: [-0.75, -0.35, -0.62],
  sad: [-0.78, -0.30, -0.45], depressed: [-0.85, -0.55, -0.70], down: [-0.55, -0.35, -0.40],
  hopeless: [-0.90, -0.40, -0.85], worthless: [-0.92, -0.35, -0.88], pointless: [-0.80, -0.45, -0.75],
  useless: [-0.82, -0.35, -0.80], failure: [-0.80, -0.15, -0.75], burden: [-0.78, -0.20, -0.72],
  stuck: [-0.58, -0.25, -0.70], trapped: [-0.72, 0.25, -0.85], helpless: [-0.80, -0.20, -0.90],
  giving: [-0.30, -0.30, -0.50], quiet: [-0.10, -0.55, -0.10], flat: [-0.45, -0.72, -0.35],
  // negative, high arousal - the agitated / anxious cluster
  anxious: [-0.65, 0.62, -0.55], panic: [-0.80, 0.88, -0.75], scared: [-0.72, 0.70, -0.65],
  afraid: [-0.70, 0.62, -0.62], terrified: [-0.85, 0.90, -0.78], worried: [-0.55, 0.45, -0.45],
  angry: [-0.62, 0.72, 0.15], furious: [-0.70, 0.88, 0.20], frustrated: [-0.58, 0.55, -0.25],
  overwhelmed: [-0.68, 0.60, -0.72], stressed: [-0.60, 0.62, -0.48], restless: [-0.35, 0.62, -0.30],
  ashamed: [-0.75, 0.25, -0.72], guilty: [-0.70, 0.25, -0.62], embarrassed: [-0.55, 0.42, -0.50],
  // positive
  ok: [0.18, -0.10, 0.15], fine: [0.22, -0.12, 0.20], better: [0.48, 0.15, 0.42],
  calm: [0.55, -0.55, 0.45], rested: [0.55, -0.35, 0.45], steady: [0.45, -0.25, 0.55],
  good: [0.62, 0.22, 0.45], happy: [0.82, 0.52, 0.60], glad: [0.68, 0.35, 0.52],
  grateful: [0.80, 0.30, 0.50], relieved: [0.65, -0.20, 0.45], proud: [0.78, 0.52, 0.78],
  hopeful: [0.70, 0.35, 0.58], excited: [0.78, 0.82, 0.60], love: [0.88, 0.55, 0.55],
  connected: [0.72, 0.25, 0.55], supported: [0.70, 0.10, 0.50], safe: [0.68, -0.30, 0.55],
  // relational and everyday distress words - the fallback needs coverage of how
  // people actually describe a bad week, not only clinical affect terms
  rough: [-0.45, 0.10, -0.30], hard: [-0.35, 0.15, -0.30], awful: [-0.72, 0.35, -0.45],
  terrible: [-0.72, 0.35, -0.45], horrible: [-0.72, 0.40, -0.45], miserable: [-0.75, -0.20, -0.55],
  argued: [-0.55, 0.50, -0.10], argument: [-0.55, 0.45, -0.15], fight: [-0.55, 0.55, -0.05],
  fought: [-0.55, 0.50, -0.10], shouted: [-0.50, 0.65, 0.05], ignored: [-0.60, 0.05, -0.55],
  ignoring: [-0.55, 0.05, -0.50], cry: [-0.65, 0.20, -0.55], crying: [-0.68, 0.25, -0.58],
  cried: [-0.65, 0.20, -0.55], tears: [-0.55, 0.15, -0.45], miss: [-0.45, -0.10, -0.35],
  missed: [-0.42, -0.10, -0.35], hurt: [-0.65, 0.20, -0.50], hurts: [-0.65, 0.20, -0.50],
  broke: [-0.55, 0.10, -0.45], broken: [-0.65, -0.10, -0.55], lost: [-0.60, -0.15, -0.60],
  sick: [-0.50, -0.30, -0.40], pain: [-0.65, 0.20, -0.50], sleepless: [-0.50, 0.30, -0.45],
  insomnia: [-0.50, 0.30, -0.45], nightmare: [-0.65, 0.55, -0.55], dread: [-0.70, 0.45, -0.65],
  nervous: [-0.45, 0.55, -0.45], tense: [-0.40, 0.55, -0.30], shaky: [-0.45, 0.55, -0.50],
  bored: [-0.30, -0.55, -0.15], bad: [-0.55, 0.05, -0.30], worse: [-0.60, 0.10, -0.45],
  nothing: [-0.30, -0.40, -0.35], nobody: [-0.50, -0.20, -0.45], unwanted: [-0.75, -0.10, -0.65],
  rejected: [-0.75, 0.10, -0.65], abandoned: [-0.78, 0.05, -0.75], jealous: [-0.55, 0.45, -0.35],
  regret: [-0.60, 0.05, -0.50], sorry: [-0.35, 0.05, -0.35], mess: [-0.45, 0.20, -0.45],
  // positive everyday
  nice: [0.50, 0.15, 0.35], lovely: [0.68, 0.25, 0.40], great: [0.70, 0.40, 0.50],
  wonderful: [0.80, 0.45, 0.55], amazing: [0.80, 0.60, 0.55], enjoyed: [0.70, 0.35, 0.50],
  enjoy: [0.65, 0.35, 0.50], peaceful: [0.60, -0.55, 0.45], cosy: [0.60, -0.45, 0.40],
  cozy: [0.60, -0.45, 0.40], warm: [0.55, -0.20, 0.40], smiled: [0.65, 0.30, 0.45],
  laugh: [0.72, 0.50, 0.50], laughing: [0.72, 0.50, 0.50], friend: [0.50, 0.15, 0.40],
  friends: [0.55, 0.20, 0.45], hug: [0.70, 0.20, 0.40], thanks: [0.55, 0.15, 0.40],
  thankful: [0.75, 0.20, 0.50], okay: [0.18, -0.10, 0.15], alright: [0.20, -0.10, 0.20],
  managed: [0.40, 0.05, 0.55], progress: [0.55, 0.30, 0.60], finished: [0.45, 0.10, 0.55],
  // hedges and intensity
  fun: [0.72, 0.55, 0.50], laughed: [0.75, 0.50, 0.50], slept: [0.30, -0.40, 0.30],
  ate: [0.20, -0.10, 0.30], walked: [0.30, 0.15, 0.40], outside: [0.35, 0.15, 0.35],
};

/** Intensity modifiers, applied multiplicatively to the following word's valence. */
export const INTENSIFIERS: Record<string, number> = {
  very: 1.35, really: 1.3, so: 1.3, extremely: 1.6, incredibly: 1.55, totally: 1.4,
  absolutely: 1.5, completely: 1.5, utterly: 1.55, deeply: 1.45, super: 1.3,
  kinda: 0.6, kind: 0.7, sorta: 0.6, slightly: 0.5, bit: 0.6, little: 0.65,
  somewhat: 0.65, barely: 0.4, hardly: 0.4, maybe: 0.75, sometimes: 0.7,
};
