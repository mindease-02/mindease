import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_REGION, EMERGENCY_NUMBERS, HELPLINES, emergencyFor, helplinesFor } from "../lib/safety/resources";
import { regionFor } from "../lib/util/region";

test("India is the default and comes first", () => {
  assert.equal(DEFAULT_REGION, "IN");
  const names = helplinesFor().map((h) => h.name);
  assert.match(names[0], /Tele-MANAS/);
  assert.ok(names.some((n) => /Kiran/.test(n)));
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
