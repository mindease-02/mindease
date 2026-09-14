import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderOfflineHelp, telOf } from "../lib/safety/offlineHelp";
import { HELPLINES, SITUATIONS, LANGUAGE_LINES } from "../lib/safety/resources";

const file = path.join(__dirname, "..", "public", "offline-help.html");

test("the committed offline help page matches the generator (run `npm run offline-help` after changing resources.ts)", () => {
  assert.equal(fs.readFileSync(file, "utf8"), renderOfflineHelp());
});

test("every Indian number, language line and situation line is on the offline page as a tel: link", () => {
  const html = renderOfflineHelp();
  for (const h of [...HELPLINES.filter((x) => x.region === "IN"), ...Object.values(LANGUAGE_LINES)]) {
    const tel = telOf(h.contact); assert.ok(tel, h.name); assert.ok(html.includes(`href="tel:${tel}"`), h.name);
  }
  for (const s of SITUATIONS) assert.ok(html.includes(`href="tel:${telOf(s.contact)}"`), s.name);
  assert.ok(html.includes('href="tel:14416"') && html.includes('href="tel:112"'));
  assert.ok(!/<script|<link/.test(html), "must be self-contained");
  assert.ok(!html.includes("1800-599-0019"), "KIRAN was merged into Tele-MANAS");
});

test("telOf picks the first dialable number", () => {
  assert.equal(telOf("Call 14416 or 1800-891-4416"), "14416");
  assert.equal(telOf("Call or WhatsApp +91 9999 666 555"), "+919999666555");
  assert.equal(telOf("findahelpline.com"), null);
});
