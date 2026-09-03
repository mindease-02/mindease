/**
 * Site palettes. The "why it exists" orb cycles through these; the choice is
 * written as CSS variables on every .world root and persisted in localStorage,
 * so the whole site - home, login, mood, chat, and the WebGL sphere - follows.
 */
export interface Palette {
  id: string;
  label: string;
  accent: string;   // primary
  accent2: string;  // highlight / italic
  mid: string;      // button gradient middle
  deep: string;     // button gradient end / sphere shadow side
  cool: string;     // secondary (rim light, satellites)
  bg: string;
  bg2: string;
}

const hexToRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`; };

export const PALETTES: Palette[] = [
  { id: "ember", label: "Ember", accent: "#f0876a", accent2: "#ffb59a", mid: "#ef7a5a", deep: "#d9634a", cool: "#7fd0e0", bg: "#07080b", bg2: "#0d0f15" },
  { id: "crimson", label: "Crimson", accent: "#e0332e", accent2: "#ff6b63", mid: "#c9221f", deep: "#8a1512", cool: "#ff9a8a", bg: "#040404", bg2: "#0c0708" },
  { id: "ocean", label: "Ocean", accent: "#3fa7d6", accent2: "#8fd3ff", mid: "#2f8fc0", deep: "#1f5f86", cool: "#7fe0d0", bg: "#05080d", bg2: "#0a1018" },
  { id: "violet", label: "Violet", accent: "#9b6bff", accent2: "#c9b3ff", mid: "#8557f0", deep: "#5a36b8", cool: "#ff8fd8", bg: "#07060d", bg2: "#0e0b18" },
  { id: "gold", label: "Gold", accent: "#e2a63a", accent2: "#ffd27a", mid: "#cf9230", deep: "#8f6320", cool: "#9fd6ff", bg: "#080704", bg2: "#12100a" },
  { id: "forest", label: "Forest", accent: "#4fb37f", accent2: "#a3ecc2", mid: "#3f9c6c", deep: "#2a6a49", cool: "#ffd08a", bg: "#050806", bg2: "#0a120d" },
];

export const THEME_KEY = "mindease.theme";
export const THEME_EVENT = "mindease:theme";

export function paletteVars(p: Palette): Record<string, string> {
  return {
    "--coral": p.accent, "--coral-2": p.accent2, "--accent-mid": p.mid, "--accent-deep": p.deep, "--cyan": p.cool,
    "--accent-rgb": hexToRgb(p.accent), "--accent2-rgb": hexToRgb(p.accent2), "--cool-rgb": hexToRgb(p.cool),
    "--bg": p.bg, "--bg-2": p.bg2,
  };
}

export function applyPalette(p: Palette, persist = true) {
  if (typeof document === "undefined") return;
  const vars = paletteVars(p);
  document.querySelectorAll<HTMLElement>(".world").forEach((el) => { for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v); el.dataset.palette = p.id; });
  document.body.style.background = p.bg;
  if (persist) { try { localStorage.setItem(THEME_KEY, p.id); } catch { /* private mode */ } }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: p }));
}

export function currentPalette(): Palette {
  if (typeof document === "undefined") return PALETTES[0];
  let id: string | null = null;
  try { id = localStorage.getItem(THEME_KEY); } catch { /* ignore */ }
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

export function nextPalette(from: Palette): Palette {
  const i = PALETTES.findIndex((p) => p.id === from.id);
  return PALETTES[(i + 1) % PALETTES.length];
}
