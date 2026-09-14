import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_REGION, EMERGENCY_NUMBERS, HELPLINES, emergencyFor, helplinesFor } from "../lib/safety/resources";
import { regionFor } from "../lib/util/region";

test("India is the default and comes first", () => {
  assert.equal(DEFAULT_REGION, "IN");
  const names = helplinesFor().map((h) => h.name);
  assert.match(names[0], /Tele-MANAS/);
  // KIRAN was merged into Tele-MANAS and phased out in 2024; it must not come back.
  assert.ok(!names.some((n) => /Kiran/i.test(n)));
  assert.ok(names.some((n) => /Vandrevala/.test(n)));
  assert.equal(names.at(-1), "Find a Helpline");
  assert.equal(emergencyFor(), "112");
});

test("known regions get local lines plus the global fallback; unknown regions get the fallback only", () => {
  assert.ok(helplinesFor("gb").some((h) => /Samaritans/.test(h.name)));
  assert.deepEqual(helplinesFor("ZZ").map((h) => h.region), ["*"]);
  assert.equal(emergencyFor("GB"), "999");
  assert.equal(emergencyFor("ZZ"), "your local emergency number");
});

test("every helpline has a contact and a region; every emergency number is short", () => {
  for (const h of HELPLINES) { assert.ok(h.region && h.name && h.contact, h.name); }
  for (const [r, n] of Object.entries(EMERGENCY_NUMBERS)) assert.match(n, /^\d{3,5}$/, r);
});

test("regionFor: time zone beats locale, locale beats nothing", () => {
  assert.equal(regionFor("Asia/Kolkata", "en-US"), "IN");
  assert.equal(regionFor("Asia/Calcutta", "en-GB"), "IN");
  assert.equal(regionFor("Europe/London", "en-GB"), "GB");
  assert.equal(regionFor("America/New_York", "en"), undefined);
  assert.equal(regionFor(undefined, undefined), undefined);
  assert.equal(regionFor("UTC", "hi-Deva-IN"), undefined); // script subtag is not a region; the server default (IN) applies
});

test("a verified line in the person's language follows Tele-MANAS", () => {
  const ta = helplinesFor("IN", "ta").map((h) => h.name);
  assert.match(ta[0], /Tele-MANAS/);
  assert.match(ta[1], /Sneha/);
  assert.equal(helplinesFor("GB", "ta").some((h) => /Sneha/.test(h.name)), false);
});

import { openNow, sortOpenFirst } from "../lib/safety/resources";

test("lines with hours know whether they answer right now, in their own time zone", () => {
  const icall = { from: 8, to: 21, days: "mon-sat" as const, timeZone: "Asia/Kolkata" };
  const tueNoonIst = Date.UTC(2026, 8, 15, 6, 30);   // Tue 12:00 IST
  const tue2amIst = Date.UTC(2026, 8, 14, 20, 30);   // Tue 02:00 IST
  const sunNoonIst = Date.UTC(2026, 8, 13, 6, 30);   // Sun 12:00 IST
  assert.equal(openNow(icall, tueNoonIst).open, true);
  assert.deepEqual(openNow(icall, tue2amIst), { open: false, opensAt: 8 });
  assert.equal(openNow(icall, sunNoonIst).open, false);
  assert.equal(openNow(undefined, tue2amIst).open, true);
  const sorted = sortOpenFirst([{ n: "icall", hours: icall }, { n: "telemanas" }], tue2amIst);
  assert.equal(sorted[0].n, "telemanas");
});
