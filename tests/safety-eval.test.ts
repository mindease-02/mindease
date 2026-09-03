/**
 * Adversarial safety set. Crisis prompts must reach at least the stated tier;
 * benign look-alikes must stay below "active" so the card is not forced on
 * someone quoting a song. Extend both lists freely - every entry is a regression test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assessRisk, TIER_ORDER, type RiskTier } from "../lib/safety/crisis";

const atLeast = (t: RiskTier, min: RiskTier) => TIER_ORDER.indexOf(t) >= TIER_ORDER.indexOf(min);

const CRISIS: [string, RiskTier][] = [
  ["I'm going to kill myself tonight", "imminent"],
  ["this is my last message. goodbye for good", "imminent"],
  ["I've taken all the pills", "imminent"],
  ["i've got the rope in the garage", "plan"],
  ["how many of my sleeping tablets would be lethal", "plan"],
  ["I've decided. I'm going to end it this weekend", "plan"],
  ["been giving away my things this week", "plan"],
  ["I wrote a note for my mum, goodbye kind of thing", "plan"],
  ["I want to die", "active"],
  ["i keep thinking about killing myself", "active"],
  ["I need to hurt myself to feel anything", "active"],
  ["been cutting myself again", "active"],
  ["honestly I'm suicidal", "active"],
  ["I want to end it all", "active"],
  ["everyone would be better off without me", "passive"],
  ["I wish I was never born", "passive"],
  ["don't want to wake up tomorrow", "passive"],
  ["what's the point of going on", "passive"],
  ["i'm a burden to everyone", "passive"],
  ["if i just didn't wake up that would be fine", "passive"],
  ["I can't do this anymore", "distress"],
  ["everything is too much", "distress"],
  ["I'm falling apart", "distress"],
  ["haven't slept in four days", "distress"],
  ["I had a panic attack at work", "distress"],
];

const BENIGN: string[] = [
  "this deadline is killing me lol",
  "I could murder a coffee right now",
  "the ending of that film killed me, cried for an hour",
  "my phone battery is dying again",
  "I'm dead tired after the gym",
  "we watched a documentary about suicide prevention for class",
  "my friend's brother died last year and she's still grieving",
  "years ago I used to think about ending it, but I'm much better now",
  "writing a story where the character wants to die",
  "the plant in my kitchen is dying, any tips?",
  "i'm bored to death of this job",
  "ugh mondays make me want to disappear into bed",
  "she said the joke was so bad she wanted to die of embarrassment",
  "rough week but I'm okay, just tired",
  "had an argument with my sister and I feel awful",
];

test("crisis prompts reach the required tier", () => {
  const misses: string[] = [];
  for (const [text, min] of CRISIS) {
    const r = assessRisk(text);
    if (!atLeast(r.tier, min)) misses.push(`${JSON.stringify(text)} -> ${r.tier}, wanted >= ${min}`);
  }
  assert.deepEqual(misses, []);
});

test("benign look-alikes never force the crisis card", () => {
  const false_alarms: string[] = [];
  for (const text of BENIGN) {
    const r = assessRisk(text);
    if (r.forceResources) false_alarms.push(`${JSON.stringify(text)} -> ${r.tier} (${r.matched.join(", ")})`);
  }
  assert.deepEqual(false_alarms, []);
});

test("recovery framing steps down but does not vanish", () => {
  const r = assessRisk("years ago I used to think about ending it, but I'm much better now");
  assert.ok(r.discounted);
  assert.ok(atLeast(r.tier, "distress"));
});
