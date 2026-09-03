import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tokenize } from "../lib/affect/tokenize";
import { fnv1a32, hashFeature } from "../lib/affect/hash";

interface Case { text: string; features: string[]; words: string[]; hashes: number[]; buckets: [number, number][] }
const fx = JSON.parse(readFileSync(new URL("./fixtures/parity.json", import.meta.url), "utf8")) as { dim: number; cases: Case[] };

test("tokenizer and hash match the Python training pipeline", () => {
  for (const c of fx.cases) {
    const { features, words } = tokenize(c.text);
    assert.deepEqual(features, c.features, `features differ for: ${c.text}`);
    assert.deepEqual(words, c.words, `words differ for: ${c.text}`);
    assert.deepEqual(features.map(fnv1a32), c.hashes, `hashes differ for: ${c.text}`);
    assert.deepEqual(features.map((f) => { const { idx, sign } = hashFeature(f, fx.dim); return [idx, sign]; }), c.buckets, `buckets differ for: ${c.text}`);
  }
});
