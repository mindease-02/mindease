/**
 * FNV-1a 32-bit.
 *
 * This MUST stay byte-identical to training/hashing.py::fnv1a32. If it drifts,
 * every exported weight lands on a different feature index and the classifier
 * degrades to noise *silently* - no crash, no error, just bad inferences about
 * someone's mood. tests/parity.test.ts pins the two implementations together and
 * training/parity_test.py writes the fixture it checks against.
 */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 0xff;
    // 32-bit multiply by the FNV prime 0x01000193 via shift-adds, so we never
    // leave the safe integer range the way h * 16777619 would.
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/**
 * Signed hashing trick (Weinberger et al. 2009). A second independent bit picks
 * the sign so collision bias is zero-mean rather than systematically additive -
 * without it, a high-dimensional hashed model inflates whichever bucket happens
 * to collect the most frequent tokens.
 */
export function hashFeature(token: string, dim: number): { idx: number; sign: number } {
  const h = fnv1a32(token);
  const s = fnv1a32("" + token);
  return { idx: h % dim, sign: (s & 1) === 1 ? 1 : -1 };
}
