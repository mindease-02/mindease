/**
 * Gen Z and Indian-English / Hinglish usage that the lexicon and the model
 * would otherwise misread. Two uses: a compact glossary in the system prompt
 * so the model reads "cooked" as "done for", not "prepared food"; and VAD
 * entries merged into the fallback lexicon so the deterministic channel is not
 * blind to it. Suicide euphemisms live in lib/safety/crisis.ts, not here.
 */
export const SLANG_GLOSSARY: [string, string][] = [
  ["lowkey / highkey", "a little, quietly / a lot, openly"],
  ["no cap, fr, ong, deadass, istg", "seriously, I'm not exaggerating"],
  ["cap", "a lie"],
  ["mid", "mediocre, underwhelming"],
  ["cooked", "done for, exhausted, or in trouble"],
  ["crashing out", "losing control - acting on despair or rage. Take seriously"],
  ["it's so over / we're so back", "hyperbole for a bad / good turn"],
  ["delulu", "delusional, usually self-aware and half-joking"],
  ["menty b", "mental breakdown, often said lightly - check"],
  ["bed rotting", "lying in bed all day; can be rest, can be withdrawal"],
  ["girl dinner", "small improvised meal; can hint at not really eating"],
  ["doomscrolling / brainrot", "compulsive scrolling; feeling fried by it"],
  ["touch grass", "go outside, get out of your head"],
  ["npc", "on autopilot, going through the motions"],
  ["ick", "sudden disgust, usually about a person"],
  ["ghosted", "cut off without explanation"],
  ["situationship", "a relationship that isn't defined"],
  ["ate, slay, W, goated, bussin", "great"],
  ["L, ratio'd", "a loss; publicly disagreed with"],
  ["ded / I'm dead / I can't", "laughing or overwhelmed - usually positive"],
  ["bruh, smh, yikes, oof", "exasperation or wince"],
  ["bffr, ngl, tbh, idc, idk, hbu, wyd", "be for real; not gonna lie; honestly; I don't care/know; how about you; what are you doing"],
  ["salty", "bitter, resentful"],
  ["in my ___ era", "a phase, self-narrated"],
  ["it's giving ___", "it resembles / has the energy of"],
  ["the way I ___", "emphasis on what follows"],
  ["yaar, bhai, bro", "friend - warmth, not literally a brother"],
  ["scene / what's the scene", "situation / what's happening"],
  ["tension", "worry, stress (\"don't take tension\")"],
  ["timepass", "killing time, nothing serious"],
  ["mood off", "feeling low"],
  ["thak gaya / thak gayi", "I'm tired (m / f)"],
  ["akela / akeli", "alone"],
  ["udaas", "sad"],
  ["gussa", "angry"],
  ["dar lag raha hai", "I'm scared"],
  ["kya karu", "what do I do"],
  ["kuch nahi", "nothing - often a deflection"],
  ["theek hai / sab theek", "fine / all fine - can be masking, like 'I'm fine'"],
  ["chill maar", "relax"],
  ["... only", "emphasis (\"I'm tired only\" = I'm just tired)"],
];

export function slangBlock(): string {
  return [
    "## Reading how they actually talk",
    "",
    "They may write in Gen Z internet English, Indian English, or Hinglish. Read it fluently and reply in plain, warm English - do not mimic the slang back at them, and never explain it. Meanings that matter:",
    ...SLANG_GLOSSARY.map(([t, m]) => `- ${t}: ${m}`),
    "- unalive, kms, sewerslide, 'delete myself', 'off myself': suicide. Always serious, however casual the tone.",
  ].join("\n");
}

/** [valence, arousal, dominance] for the deterministic fallback channel. */
export const SLANG_VAD: Record<string, [number, number, number]> = {
  cooked: [-0.55, 0.1, -0.5], mid: [-0.25, -0.2, -0.1], slay: [0.7, 0.5, 0.5], ate: [0.6, 0.4, 0.5], bussin: [0.6, 0.5, 0.3],
  goated: [0.7, 0.5, 0.6], ick: [-0.5, 0.3, -0.1], cringe: [-0.4, 0.2, -0.2], delulu: [0.1, 0.3, -0.1], sus: [-0.3, 0.3, -0.1],
  salty: [-0.4, 0.4, -0.2], ghosted: [-0.6, 0.1, -0.6], fomo: [-0.4, 0.4, -0.3], vibing: [0.5, 0.1, 0.3], crashing: [-0.6, 0.7, -0.6],
  spiraling: [-0.6, 0.6, -0.6], spiralling: [-0.6, 0.6, -0.6], doomscrolling: [-0.4, 0.1, -0.4], burnt: [-0.5, -0.4, -0.4],
  overstimulated: [-0.5, 0.6, -0.4], based: [0.4, 0.3, 0.4], sheesh: [0.3, 0.6, 0.2], bruh: [-0.2, 0.3, 0], smh: [-0.3, 0.2, 0],
  yikes: [-0.4, 0.4, -0.2], oof: [-0.35, 0.3, -0.2], rip: [-0.4, 0.1, -0.3], menty: [-0.6, 0.5, -0.6], meh: [-0.2, -0.4, -0.1],
  blah: [-0.3, -0.4, -0.2], ugh: [-0.4, 0.3, -0.2], rotting: [-0.5, -0.5, -0.5], fried: [-0.5, -0.1, -0.4], npc: [-0.3, -0.4, -0.3],
  tension: [-0.5, 0.5, -0.4], udaas: [-0.6, -0.3, -0.5], gussa: [-0.5, 0.6, 0.1], akela: [-0.6, -0.3, -0.5], akeli: [-0.6, -0.3, -0.5],
  thak: [-0.4, -0.6, -0.3], dar: [-0.5, 0.5, -0.5], bakwaas: [-0.4, 0.3, 0], timepass: [0.2, -0.2, 0.1], yaar: [0.2, 0.1, 0.1],
};

/** Slang intensifiers, merged into the lexicon's intensifier table. */
export const SLANG_INTENSIFIERS: Record<string, number> = { deadass: 1.3, fr: 1.2, highkey: 1.3, lowkey: 0.75, ong: 1.2, istg: 1.3, bffr: 1.1, literally: 1.2, fully: 1.2 };
