import { test } from "node:test";
import assert from "node:assert/strict";
import { addMemories, newMemory, retrieve, forget } from "../lib/memory/index";
import { cosine, embed } from "../lib/memory/embed";

test("embeddings are unit vectors and similar texts are close", () => {
  const a = embed("Their sister Maya lives in Leeds");
  const b = embed("Maya, the sister, is in Leeds");
  const c = embed("They started running in the mornings");
  assert.ok(Math.abs(cosine(a, a) - 1) < 1e-6);
  assert.ok(cosine(a, b) > cosine(a, c));
});

test("retrieval ranks the relevant memory first", () => {
  const mems = [
    newMemory("person", "Their sister Maya lives in Leeds; they fell out in March", 0.9),
    newMemory("preference", "They like walking by the canal in the evening", 0.4),
    newMemory("past", "As a child they spent summers at their grandmother's farm", 0.6, Date.now(), "childhood"),
  ];
  const r = retrieve(mems, "I was thinking about Maya again", 3);
  assert.equal(r[0].item.kind, "person");
});

test("near-duplicates merge instead of piling up", () => {
  const a = newMemory("person", "Their brother Sam calls every Sunday", 0.5);
  const b = newMemory("person", "Their brother Sam calls every Sunday evening", 0.7);
  const merged = addMemories([a], [b]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].importance, 0.7);
});

test("forget removes by id", () => {
  const a = newMemory("fact", "They work nights at the hospital", 0.5);
  assert.equal(forget([a], a.id).length, 0);
});
