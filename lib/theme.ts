/**
 * Site palettes. The "why it exists" orb cycles through these; the choice is
 * written as CSS variables on every .world root and persisted in localStorage,
 * so the whole site - home, login, mood, chat, and the WebGL sphere - follows.
 */
export interface Palette {
  /** Same ids as the arrival moods in lib/moods.ts. */
  id: string;
  label: string;
  /** Short hint, on the tile. */
  hint: string;
  /** One sentence on what MindEase does with this mood. Under the ball and on the tile. */
  description: string;
  accent: string;   // primary
  accent2: string;  // highlight / italic
  mid: string;      // button gradient middle
  deep: string;     // button gradient end / sphere shadow side
  cool: string;     // secondary (rim light, satellites)
  /** Text colour that meets 4.5:1 on `accent` (buttons, chips). */
  onAccent: string;
  bg: string;
  bg2: string;
}

const hexToRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; };

export const PALETTES: Palette[] = [
  { id: "okay", label: "Okay", hint: "fine, actually — just here", description: "MindEase keeps it light and follows whatever has your attention.", accent: "#f0876a", accent2: "#ffb59a", mid: "#ef7a5a", deep: "#d9634a", cool: "#7fd0e0", onAccent: "#1a0d09", bg: "#07080b", bg2: "#0d0f15" },
  { id: "hopeful", label: "Hopeful", hint: "something's lifting", description: "MindEase asks what shifted and helps you keep hold of it.", accent: "#4fb37f", accent2: "#a3ecc2", mid: "#3f9c6c", deep: "#2a6a49", cool: "#ffd08a", onAccent: "#04140b", bg: "#050806", bg2: "#0a120d" },
  { id: "heavy", label: "Heavy", hint: "low, flat, hard to move", description: "MindEase slows down, stays close, and asks about the next hour instead of the next month.", accent: "#3fa7d6", accent2: "#8fd3ff", mid: "#2f8fc0", deep: "#1f5f86", cool: "#7fe0d0", onAccent: "#04121c", bg: "#05080d", bg2: "#0a1018" },
  { id: "lonely", label: "Lonely", hint: "nobody to tell", description: "MindEase listens, then points you back toward a real person by name.", accent: "#4fc3d6", accent2: "#a9eef5", mid: "#3aa9bd", deep: "#22707e", cool: "#ffb59a", onAccent: "#031416", bg: "#04090a", bg2: "#091416" },
  { id: "anxious", label: "Anxious", hint: "wired, braced, can't settle", description: "MindEase helps you slow the breath first, then look at the evidence together.", accent: "#9b6bff", accent2: "#c9b3ff", mid: "#8557f0", deep: "#5a36b8", cool: "#ff8fd8", onAccent: "#120a2a", bg: "#07060d", bg2: "#0e0b18" },
  { id: "angry", label: "Angry", hint: "at someone, or everything", description: "MindEase takes the anger seriously, and offers a way to bring the heat down when you want it.", accent: "#dd312c", accent2: "#ff6b63", mid: "#c9221f", deep: "#8a1512", cool: "#ff9a8a", onAccent: "#ffffff", bg: "#040404", bg2: "#0c0708" },
  { id: "restless", label: "Restless", hint: "need to do something, unsure what", description: "MindEase helps you find the nearest small thing you've been avoiding.", accent: "#e2a63a", accent2: "#ffd27a", mid: "#cf9230", deep: "#8f6320", cool: "#9fd6ff", onAccent: "#1a1204", bg: "#080704", bg2: "#12100a" },
  { id: "numb", label: "Numb", hint: "not much of anything", description: "MindEase doesn't push for feeling; it asks about the body, the day, and what's near.", accent: "#9aa0ad", accent2: "#d5d9e2", mid: "#7f8694", deep: "#4c515c", cool: "#9fd6ff", onAccent: "#0b0c10", bg: "#060708", bg2: "#0e1013" },
];

export const THEME_KEY = "mindease.theme";
export const THEME_EVENT = "mindease:theme";

export function paletteVars(p: Palette): Record<string, string> {
  return {
    "--coral": p.accent, "--coral-2": p.accent2, "--accent-mid": p.mid, "--accent-deep": p.deep, "--cyan": p.cool,
    "--accent-rgb": hexToRgb(p.accent), "--accent2-rgb": hexToRgb(p.accent2), "--cool-rgb": hexToRgb(p.cool),
    "--bg": p.bg, "--bg-2": p.bg2, "--on-accent": p.onAccent,
    // Semantic aliases (design-system/mindease/MASTER.md): components use these, never raw hex.
    "--color-primary": p.accent, "--color-on-primary": p.onAccent, "--color-secondary": p.cool,
    "--color-accent": p.accent2, "--color-background": p.bg, "--color-foreground": "#ecebe7",
    "--color-ring": p.cool,
  };
}

export function applyPalette(p: Palette, persist = true) {
  if (typeof document === "undefined") return;
  const vars = paletteVars(p);
  document.querySelectorAll<HTMLElement>(".world").forEach((el) => { for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v); el.dataset.palette = p.id; });
  document.body.style.background = p.bg;
  // Session-only: a mood picked today should not recolour the site forever.
  if (persist) { try { sessionStorage.setItem(THEME_KEY, p.id); localStorage.removeItem(THEME_KEY); } catch { /* private mode */ } }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: p }));
}

export function currentPalette(): Palette {
  if (typeof document === "undefined") return PALETTES[0];
  let id: string | null = null;
  try { id = sessionStorage.getItem(THEME_KEY); localStorage.removeItem(THEME_KEY); } catch { /* ignore */ }
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

export function nextPalette(from: Palette): Palette {
  const i = PALETTES.findIndex((p) => p.id === from.id);
  return PALETTES[(i + 1) % PALETTES.length];
}

export const paletteById = (id: string | null | undefined): Palette | null => PALETTES.find((p) => p.id === id) ?? null;
