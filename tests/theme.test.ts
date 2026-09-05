import { test } from "node:test";
import assert from "node:assert/strict";
import { PALETTES, nextPalette, paletteById, paletteVars } from "../lib/theme";
import { MOODS } from "../lib/moods";

const HEX = /^#[0-9a-f]{6}$/;
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("eight palettes, unique ids, valid colours", () => {
  assert.equal(PALETTES.length, 8);
  assert.equal(new Set(PALETTES.map((p) => p.id)).size, 8);
  for (const p of PALETTES) for (const k of ["accent", "accent2", "mid", "deep", "cool", "onAccent", "bg", "bg2"] as const) assert.match(p[k], HEX, `${p.id}.${k}`);
});

test("button text meets WCAG AA on every accent", () => {
  for (const p of PALETTES) assert.ok(contrast(p.accent, p.onAccent) >= 4.5, `${p.id}: ${contrast(p.accent, p.onAccent).toFixed(2)}`);
});

test("every palette has a hint and a one-line description", () => {
  for (const p of PALETTES) { assert.ok(p.label && p.hint, p.id); assert.ok(p.description.length > 20 && p.description.length < 140, p.id); }
});

test("nextPalette cycles and wraps", () => {
  let p = PALETTES[0];
  const seen: string[] = [];
  for (let i = 0; i < PALETTES.length; i++) { seen.push(p.id); p = nextPalette(p); }
  assert.deepEqual(seen, PALETTES.map((x) => x.id));
  assert.equal(p.id, PALETTES[0].id);
});

test("paletteById and paletteVars", () => {
  assert.equal(paletteById("anxious")?.accent, "#9b6bff");
  assert.equal(paletteById("nope"), null);
  const v = paletteVars(PALETTES[0]);
  assert.equal(v["--coral"], PALETTES[0].accent);
  assert.equal(v["--accent-rgb"], "240, 135, 106");
  assert.equal(v["--color-primary"], v["--coral"]);
  assert.equal(v["--color-background"], PALETTES[0].bg);
});

test("arrival moods mirror the palettes", () => {
  assert.deepEqual(MOODS.map((m) => m.id), PALETTES.map((p) => p.id));
  for (const m of MOODS) assert.equal(m.c, paletteById(m.id)?.accent);
});
