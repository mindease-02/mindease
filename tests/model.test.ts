import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { predictEmotions, type SparseLinearModel } from "../lib/affect/classifier";
import { analyzeText } from "../lib/affect/textAffect";

const path = new URL("../models/emotion.model.json", import.meta.url);

test("trained emotion head loads and ranks obvious cases correctly", { skip: !existsSync(path) && "models/emotion.model.json not built" }, () => {
  const model = JSON.parse(readFileSync(path, "utf8")) as SparseLinearModel;
  assert.equal(model.outputs.length, 28);
  const top = (t: string) => predictEmotions(model, t).top[0].label;
  assert.equal(top("thank you so much, that really helped"), "gratitude");
  assert.equal(top("I love her more than anything"), "love");
  assert.ok(["fear", "nervousness"].includes(top("I'm terrified about the results tomorrow")));
  assert.ok(["sadness", "grief", "disappointment"].includes(top("I miss him so much it hurts")));
});

test("text channel reports the trained source when the model is present", { skip: !existsSync(path) && "models/emotion.model.json not built" }, () => {
  const model = JSON.parse(readFileSync(path, "utf8")) as SparseLinearModel;
  const r = analyzeText("honestly a rough week, my sister hasn't called since we argued", { emotion: model });
  assert.ok(r.reading.vad.valence < 0, `valence ${r.reading.vad.valence}`);
  assert.ok((r.emotions.top[0]?.p ?? 0) > 0);
});
