import { test } from "node:test";
import assert from "node:assert/strict";
import { addDay, weeklyMeans } from "../lib/reading/daily";
import { decideCrisisSurface } from "../lib/crisis/surface";
import { assessRisk } from "../lib/safety/crisis";
import { broughtUp, personName } from "../lib/memory/brought";
import { newMemory } from "../lib/memory";
import { countermeasuresFor } from "../lib/dependency";

const now = Date.UTC(2026, 8, 14, 12);
const flat = { joy: 0.1, trust: 0.2, fear: 0.2, surprise: 0.1, sadness: 0.7, disgust: 0.1, anger: 0.3, anticipation: 0.2 };

test("daily axes accumulate and average by week", () => {
  let days = addDay(undefined, flat, now, "Asia/Kolkata");
  days = addDay(days, { ...flat, sadness: 0.3 }, now + 3600_000, "Asia/Kolkata");
  assert.equal(days.length, 1);
  const weeks = weeklyMeans(days, now + 3600_000, "Asia/Kolkata", 2);
  const sad = weeks.find((w) => w.label === "sadness")!.values;
  assert.equal(sad[0], null);
  assert.ok(Math.abs((sad[1] as number) - 0.5) < 1e-6);
});

test("explicit crisis language shows help at once; softer signals ask first", () => {
  const base = { modelRaised: false, history: [], valenceNow: 0, stickyTier: { tier: "none", at: 0 }, now };
  const explicit = assessRisk("i wish i was dead");
  assert.equal(decideCrisisSurface({ ...base, regex: explicit, final: explicit }), "show");
  const active = assessRisk("i want to kill myself");
  assert.equal(decideCrisisSurface({ ...base, regex: active, final: active }), "show");
  const soft = assessRisk("honestly i'm a burden to everyone");
  assert.equal(decideCrisisSurface({ ...base, regex: soft, final: soft }), "confirm");
  const none = assessRisk("long day at work");
  assert.equal(decideCrisisSurface({ ...base, regex: none, final: none }), null);
  const lows = [1, 2, 3].map((h) => ({ at: now - h * 3600_000, valence: -0.7 })) as never;
  assert.equal(decideCrisisSurface({ ...base, regex: none, final: none, history: lows, valenceNow: -0.6 }), "confirm");
  assert.equal(decideCrisisSurface({ ...base, regex: soft, final: soft, lastConfirmAt: now - 3600_000 }), null);
});

test("brought-up memories are the ones the reply actually used", () => {
  const maya = newMemory("person", "Their sister Maya fell out with them in March", 0.8, now);
  const job = newMemory("goal", "Wants the promotion but is scared of the interview", 0.6, now);
  const sea = newMemory("past", "Grew up by the sea and misses it in winter", 0.5, now);
  const used = broughtUp("Have you talked to Maya since March? The interview can wait a day.", [maya, job, sea]);
  assert.deepEqual(used.map((m) => m.id), [maya.id]);
  assert.equal(personName(maya), "Maya");
});

test("reliance tiers cut the check-in budget and shorten replies as reliance climbs", () => {
  const tiers = (["healthy", "watch", "elevated", "high"] as const).map(countermeasuresFor);
  const budgets = tiers.map((c) => c.reachOutBudgetMultiplier);
  assert.deepEqual([...budgets].sort((a, b) => b - a), budgets);
  assert.ok(tiers[2].shortenResponses && tiers[3].shortenResponses && !tiers[0].shortenResponses);
});

import { readConfidence } from "../lib/reading/confidence";

test("confidence stays low for one-word messages and can rise for clear, substantive ones", () => {
  assert.ok(readConfidence({ source: "model", coverage: 0.2, snapshot: 0.3, model: 0.9, text: "ok" }) <= 0.35);
  assert.ok(readConfidence({ source: "model", coverage: 0.05, snapshot: 0.2, model: 0.85, text: "Got the offer letter today, I can't stop smiling" }) >= 0.7);
  assert.ok(readConfidence({ source: "model", coverage: 0.6, snapshot: 0.3, model: 0.2, text: "well that happened I guess, whatever it means" }) <= 0.2);
});

import { replyBudget, effectiveWeeklyBudget, chatNotice } from "../lib/dependency/effects";
import { assessDependency } from "../lib/dependency";
import { decideProactive, DEFAULT_CONSENT } from "../lib/proactive/policy";

test("full reliance loop: leaning in more cuts check-ins, shortens replies, and tells the person", () => {
  const DAYMS = 86_400_000;
  const mk = (at: number, social: number) => ({ at, valence: -0.2, arousal: 0, dominance: 0, confidence: 0.6, markers: { firstPersonSingular: 0.1, firstPersonPlural: 0, absolutist: 0, obligation: 0, pastFocus: 0, futureFocus: 0, socialReference: social, negativeEmotion: 0, positiveEmotion: 0, tokens: 20 } });
  const history = [
    // baseline, 60 to 14 days ago: about one message a day, people mentioned often
    ...Array.from({ length: 46 }, (_, i) => mk(now - (60 - i) * DAYMS, 0.06)),
    // last two weeks: many messages a day, people rarely mentioned
    ...Array.from({ length: 14 * 8 }, (_, i) => mk(now - 14 * DAYMS + i * (DAYMS / 8), 0.005)),
  ] as never;
  const dep = assessDependency(history, ["you're the only one who gets me", "i don't need anyone else, just you"], now);
  assert.ok(dep.tier === "elevated" || dep.tier === "high", `tier was ${dep.tier}`);
  assert.ok(effectiveWeeklyBudget(DEFAULT_CONSENT.weeklyBudget, dep.tier) < DEFAULT_CONSENT.weeklyBudget);
  const healthy = replyBudget("healthy", false), leaning = replyBudget(dep.tier, false);
  assert.ok(leaning.maxTokens < healthy.maxTokens && leaning.maxSentences !== null);
  assert.equal(replyBudget(dep.tier, true).maxSentences, null, "a crisis turn is never shortened");
  const decision = decideProactive({ trend: { sufficient: false, triggerScore: 0, agreement: 0 } as never, dependency: dep, consent: { ...DEFAULT_CONSENT, enabled: true, timeZone: "UTC" }, history: [], lastUserMessageAt: 0, recentRisk: { tier: "none", at: 0 }, now });
  const budgetGate = decision.gates.find((g) => g.name === "budget")!;
  assert.match(budgetGate.detail, /reduced from/);
  const state = { history, outreach: [], tools: [], milestones: [], peopleContacts: [], timeZone: "UTC", notices: {} } as never;
  const first = chatNotice(state, dep.tier, now);
  assert.equal(first.notice, "shorter");
  assert.equal(chatNotice({ ...(state as object), notices: first.notices } as never, dep.tier, now + 3600_000).notice, null, "not repeated within the week");
});

test("steadier note appears when check-ins shrank and the person still showed up", () => {
  const DAYMS = 86_400_000;
  const history = Array.from({ length: 16 }, (_, i) => ({ at: now - i * DAYMS * 0.8, valence: 0.1, arousal: 0, dominance: 0, confidence: 0.6, markers: { socialReference: 0.05 } }));
  const outreach = [{ at: now - 8 * DAYMS }, { at: now - 9 * DAYMS }, { at: now - 10 * DAYMS }];
  const s = { history, outreach, tools: [], milestones: [], peopleContacts: [], timeZone: "UTC", notices: {} } as never;
  assert.equal(chatNotice(s, "healthy", now).notice, "steadier");
});

import { pickCheckinKind } from "../lib/proactive/kind";

test("a check-in style marked not useful twice is skipped, by rule, not learning", () => {
  const h = [{ at: now - 86_400_000, kind: "observation", rejected: true }, { at: now - 2 * 86_400_000, kind: "observation", rejected: true }, { at: now - 3 * 86_400_000, kind: "callback", rejected: true }] as never;
  assert.equal(pickCheckinKind("observation", h, now), "light_touch");
  assert.equal(pickCheckinKind("callback", h, now), "callback");
  assert.equal(pickCheckinKind("bridge", h, now), "bridge");
});

test("indirect warning signs are flagged deterministically, without the model", () => {
  for (const text of ["I've been giving my things away. won't need them where I'm going", "don't worry, I won't be a problem much longer", "writing goodbye letters to everyone tonight"]) {
    assert.ok(atLeastActive(assessRisk(text).tier), text);
  }
  for (const text of ["giving away my old clothes to charity this weekend", "where I'm going on holiday I won't need a jacket? kidding, packing now"]) {
    assert.ok(!atLeastActive(assessRisk(text).tier) || assessRisk(text).discounted, text);
  }
});
function atLeastActive(t: string) { return ["active", "plan", "imminent"].includes(t); }

test("crisis detection works with the curly apostrophes phone keyboards type", () => {
  assert.equal(assessRisk("I don’t want to be here anymore").tier, "passive");
  assert.ok(["active", "plan", "imminent"].includes(assessRisk("I won’t be a problem much longer").tier));
  assert.equal(assessRisk("everyone’d be better off without me").tier, assessRisk("everyone'd be better off without me").tier);
});

import { mergeConcurrent } from "../lib/store/merge";

test("a turn's save keeps what the person changed while the model was working", () => {
  const m = (id: string, text: string) => ({ id, text, kind: "person", at: now, importance: 0.5, embedding: [], recallCount: 0, lastRecalledAt: 0 });
  const base = { history: [{}, {}], memories: [m("a", "Maya"), m("b", "Kavya")], consent: { enabled: true, memoryMode: "ask", voiceSignals: false, quietFrom: 22 }, readCorrections: [{ at: 5, said: "sadness", meant: "anger" }], replyFeedback: [], peopleContacts: [], tools: [], outreach: [], notices: {} };
  const turn = { ...structuredClone(base), memories: [{ ...m("a", "Maya"), recallCount: 1, lastRecalledAt: now }, m("b", "Kavya")], consent: { ...base.consent, quietFrom: 23 } } as never;
  const fresh = { ...structuredClone(base), memories: [m("a", "Maya, sister"), m("c", "kept mid-turn")], consent: { ...base.consent, voiceSignals: true }, replyFeedback: [{ at: 9, verdict: "helped" }] } as never;
  const out = mergeConcurrent(turn, fresh, { recalledIds: ["a"], addedMemoryIds: [], acknowledgedCorrectionAt: 5 });
  assert.deepEqual(out.memories.map((x) => x.id), ["a", "c"], "forgotten b stays gone, kept c stays");
  assert.equal(out.memories[0].text, "Maya, sister");
  assert.equal(out.memories[0].recallCount, 1);
  assert.equal(out.consent.voiceSignals, true);
  assert.equal((out.consent as { quietFrom: number }).quietFrom, 23);
  assert.equal(out.replyFeedback!.length, 1);
  assert.equal(out.readCorrections![0].acknowledged, true);
});
