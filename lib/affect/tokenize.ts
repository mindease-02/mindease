/**
 * Tokenizer. MUST stay behaviourally identical to training/hashing.py::tokenize.
 *
 * Design notes:
 *  - Negation scope matters more than any individual word ("not good" vs "good"),
 *    so we emit explicit NOT_ prefixes over a 3-token window rather than hoping
 *    bigrams catch it. Clause breaks close the window.
 *  - Elongation ("sooooo") is an intensity marker, not noise: we normalise the
 *    spelling so it shares a weight with the base word, and emit a separate
 *    intensity feature so the intensity itself survives.
 *  - Punctuation and emoji are kept. In short turns they carry most of the affect,
 *    and short turns are exactly where the lexical channel is otherwise weakest.
 */

const NEGATORS = new Set([
  "not", "no", "never", "cannot", "cant", "wont", "dont", "doesnt", "didnt",
  "isnt", "arent", "wasnt", "werent", "havent", "hasnt", "hadnt", "aint",
  "neither", "nor", "without", "hardly", "barely", "rarely",
]);

const CLAUSE_BREAK = new Set([".", "!", "?", ",", ";", ":", "but", "though", "however", "although"]);
const NEG_WINDOW = 3;

const CONTRACTIONS: [string, string][] = [
  ["n't", " not"], ["'re", " are"], ["'s", " is"], ["'d", " would"],
  ["'ll", " will"], ["'ve", " have"], ["'m", " am"],
];

export function normalize(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/https?:\/\/\S+|www\.\S+/g, " <url> ");
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, " <email> ");
  t = t.replace(/\d[\d,.]*/g, " <num> ");
  t = t.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  for (const [k, v] of CONTRACTIONS) t = t.split(k).join(v);
  return t;
}

// placeholders | words | emoji | punctuation runs
const WORD_RE = /<[a-z]+>|[a-z]+|\p{Extended_Pictographic}|[!?.,;:]+/gu;

export interface TokenizeResult {
  /** Hashable feature strings: negation-scoped unigrams, bigrams, shape features. */
  features: string[];
  /** Plain word tokens - used for lexicon lookups and psycholinguistic markers. */
  words: string[];
}

export function tokenize(text: string): TokenizeResult {
  const norm = normalize(text);
  const raw = norm.match(WORD_RE) ?? [];

  const words: string[] = [];
  const shape: string[] = [];

  for (const r of raw) {
    if (/^<[a-z]+>$/.test(r)) {
      words.push(r);
    } else if (/^[a-z]+$/.test(r)) {
      const collapsed = r.replace(/(.)\1\1+/g, "$1$1"); // soooo -> soo
      if (collapsed !== r) shape.push("<elong>");
      words.push(collapsed);
    } else if (/^[!?.,;:]+$/.test(r)) {
      if (/^\.{3,}$/.test(r)) shape.push("<ellipsis>"); // trailing off is real signal
      else if (r.length > 1) shape.push("<punct_run>");
      if (r.includes("!")) shape.push("<excl>");
      if (r.includes("?")) shape.push("<qmark>");
      words.push(r[0]);
    } else {
      shape.push("<emoji>");
      words.push(r);
    }
  }

  const features: string[] = [];
  let negLeft = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (CLAUSE_BREAK.has(w)) negLeft = 0;
    if (NEGATORS.has(w)) {
      negLeft = NEG_WINDOW;
      features.push(w);
      continue;
    }
    features.push(negLeft > 0 ? "NOT_" + w : w);
    if (negLeft > 0) negLeft--;
    if (i > 0) features.push(words[i - 1] + "|" + w);
  }

  for (const s of shape) features.push(s);
  if (words.length <= 4) features.push("<terse>");

  return { features, words: words.filter((w) => /^[a-z]/.test(w)) };
}
