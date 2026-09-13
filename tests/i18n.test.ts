import { test } from "node:test";
import assert from "node:assert/strict";
import { t, UI_LANGS, greetingFor, moodText, languageInstruction, scriptOf, pickUi } from "../lib/i18n";
import en from "../lib/i18n/en";
import ta from "../lib/i18n/ta";
import hi from "../lib/i18n/hi";
import te from "../lib/i18n/te";
import kn from "../lib/i18n/kn";
import ml from "../lib/i18n/ml";

test("every UI language covers every English key", () => {
  const keys = Object.keys(en);
  for (const [name, dict] of Object.entries({ ta, hi, te, kn, ml })) {
    const missing = keys.filter((k) => !(k in dict));
    assert.deepEqual(missing, [], `${name} is missing ${missing.length} keys`);
    const extra = Object.keys(dict).filter((k) => !(k in en));
    assert.deepEqual(extra, [], `${name} has keys English does not: ${extra.join(", ")}`);
  }
});

test("placeholders survive translation", () => {
  const withVars = Object.entries(en).filter(([, v]) => /\{\w+\}/.test(v));
  for (const [k, v] of withVars) {
    const vars = [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    for (const lang of UI_LANGS) for (const name of vars) assert.ok(t(k, lang).includes(`{${name}}`), `${lang}.${k} lost {${name}}`);
  }
  assert.equal(t("hereFor", "ta", { name: "Priya" }), "Priyaக்காக இங்கே");
});

test("t falls back to English and then to the key", () => {
  assert.equal(t("send", "xx"), "Send");
  assert.equal(t("no-such-key", "ta"), "no-such-key");
});

test("greetings and mood tiles exist in all six languages", () => {
  for (const lang of UI_LANGS) {
    assert.ok(greetingFor("Priya", null, lang).includes("Priya"));
    assert.ok(greetingFor("Priya", { label: "Anxious" }, lang).length > 10);
    assert.ok(greetingFor("Priya", { label: "Heavy", note: "exam" }, lang).includes("exam"));
    for (const id of ["okay", "hopeful", "heavy", "lonely", "anxious", "angry", "restless", "numb"]) assert.ok(moodText(id, lang)?.[0]);
  }
});

test("language instruction and script detection", () => {
  assert.match(languageInstruction("auto"), /same script/);
  assert.match(languageInstruction("ta"), /Tamil/);
  assert.equal(scriptOf("இன்று கஷ்டமா இருக்கு"), "ta");
  assert.equal(scriptOf("आज भारी है"), "hi");
  assert.equal(scriptOf("ఈ రోజు"), "te");
  assert.equal(scriptOf("hello"), "en");
  assert.equal(pickUi("auto", "ta"), "ta");
  assert.equal(pickUi("hi", "ta"), "hi");
  assert.equal(pickUi(undefined, undefined), "en");
});
