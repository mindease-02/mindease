import { test } from "node:test";
import assert from "node:assert/strict";
import { assessRisk } from "../lib/safety/crisis";

test("imminent intent is caught and forces resources", () => {
  const r = assessRisk("I'm going to kill myself tonight");
  assert.equal(r.tier, "imminent");
  assert.ok(r.forceResources && r.overrideConversation);
});

test("past-tense framing steps down one tier but never below distress", () => {
  const r = assessRisk("years ago I used to think about killing myself");
  assert.equal(r.discounted, true);
  assert.equal(r.tier, "passive");
  assert.equal(r.forceResources, false);
});

test("passive ideation asks, does not force the card", () => {
  const r = assessRisk("everyone would be better off without me");
  assert.equal(r.tier, "passive");
  assert.equal(r.forceResources, false);
});

test("ordinary sadness is not a crisis", () => {
  const r = assessRisk("I had a rough day and feel pretty low");
  assert.equal(r.tier, "none");
});
