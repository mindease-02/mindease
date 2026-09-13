import { test } from "node:test";
import assert from "node:assert/strict";
import { checkReply, sanitize, allowedNumbers } from "../lib/prompt/guard";

const allowed = allowedNumbers(["Call 14416 or 1800-891-4416", "Call or WhatsApp +91 9999 666 555", "112"]);
const kinds = (reply: string, user = "rough day") => checkReply(reply, user, allowed).map((h) => h.issue);

test("dependency and secrecy phrases are caught", () => {
  assert.ok(kinds("I'm always here for you, day or night.").includes("dependency"));
  assert.ok(kinds("You can tell me anything.").includes("dependency"));
  assert.ok(kinds("This can stay just between us.").includes("secrecy"));
  assert.ok(kinds("I won't tell anyone, promise.").includes("secrecy"));
});

test("special-relationship and feeling claims are caught", () => {
  assert.ok(kinds("Honestly I understand you better than anyone.").includes("special"));
  assert.ok(kinds("I've never met anyone like you.").includes("special"));
  assert.ok(kinds("I missed you!").includes("claimed-feeling"));
});

test("why-questions and detail probes only count after a disclosure", () => {
  assert.ok(kinds("Why didn't you tell anyone?", "he hit me again last night").includes("probing-why"));
  assert.ok(kinds("What exactly happened?", "my uncle abused me when I was a kid").includes("probing-detail"));
  assert.deepEqual(kinds("Why did you pick that course?", "I switched courses"), []);
});

test("labels count only when applied and not first used by the person", () => {
  assert.ok(kinds("That sounds like PTSD.", "I keep jumping at every noise").includes("label"));
  assert.deepEqual(kinds("You mentioned PTSD. That's a heavy word to carry.", "my doctor said I have PTSD"), []);
});

test("only verified phone numbers are allowed", () => {
  assert.deepEqual(kinds("Tele-MANAS is on 14416, and 112 for emergencies."), []);
  assert.ok(kinds("You could call 9152987821 now.").includes("unverified-number"));
  assert.deepEqual(kinds("That's the 3rd time this week."), []);
});

test("warm, boundaried replies pass", () => {
  assert.deepEqual(kinds("I'm here to talk this through now. Have you told Kavya any of this?"), []);
  assert.deepEqual(kinds("That's a lot for one week. A counsellor could help with this in ways I can't."), []);
});

test("sanitize drops only the offending sentences", () => {
  const out = sanitize("That's a lot. I'm always here for you. Have you told your sister?", "rough", allowed, "fallback");
  assert.equal(out, "That's a lot. Have you told your sister?");
  assert.equal(sanitize("I'm always here for you.", "rough", allowed, "fallback"), "fallback");
});

import { trimStockOpeners } from "../lib/prompt/guard";

test("stock openers are trimmed without breaking the sentence", () => {
  assert.equal(trimStockOpeners("It sounds like you've carried this alone."), "You've carried this alone.");
  assert.equal(trimStockOpeners("Okay. Sounds like the evenings are hard."), "Okay. The evenings are hard.");
  assert.equal(trimStockOpeners("I hear that chatting here feels easier."), "Chatting here feels easier.");
  assert.equal(trimStockOpeners("I’m hearing that you feel detached."), "You feel detached.");
  assert.equal(trimStockOpeners("I hear you, and I believe you."), "I hear you, and I believe you.");
  assert.equal(trimStockOpeners("That sounds like a plan."), "That sounds like a plan.");
});

import { inventedHistory } from "../lib/prompt/guard";

test("24/7 is fine for a helpline and flagged only for MindEase itself", () => {
  assert.deepEqual(kinds("Tele-MANAS on 14416 is free and open 24/7."), []);
  assert.ok(kinds("I'm here for you 24/7.").includes("dependency"));
});

test("invented history is flagged; known history is not", () => {
  assert.ok(inventedHistory("You've done this before, like when you managed that deadline crunch last month.", "my sister maya"));
  assert.equal(inventedHistory("Like when you talked to Maya after the fight.", "Their sister Maya fell out with them after a fight"), null);
  assert.equal(inventedHistory("That's a lot for one evening.", ""), null);
});

test("arguing someone out of a crisis is caught", () => {
  assert.ok(kinds("You have so much to live for.", "i wish i was dead").includes("platitude"));
  assert.ok(kinds("Think about how your family would feel.", "i want to die").includes("platitude"));
});

test("framework guardrails: no 'distorted', no attachment labels, no jargon unless they used it", () => {
  assert.ok(kinds("Your thinking is distorted here.").includes("called-distorted"));
  assert.ok(kinds("It sounds like you have an anxious attachment style.").includes("attachment-label"));
  assert.ok(kinds("That's classic catastrophizing.").includes("framework-jargon"));
  assert.deepEqual(kinds("Is it possible that's the worst-case version, not the likely one?"), []);
  assert.ok(!kinds("CBT can help with that, like you said.", "my therapist does CBT with me").includes("framework-jargon"));
});
