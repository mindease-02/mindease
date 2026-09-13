import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklyReflection, toolsSummary } from "../lib/reflection";
import { worthChecking } from "../lib/llm/insight";
import type { UserState } from "../lib/store/types";

const DAY = 86_400_000;
const now = Date.UTC(2026, 8, 14, 12);

function state(points: { daysAgo: number; social: boolean }[], extra: Partial<UserState> = {}): UserState {
  return {
    history: points.map((p) => ({ at: now - p.daysAgo * DAY, valence: 0, arousal: 0, dominance: 0, confidence: 0.5, markers: { socialReference: p.social ? 0.1 : 0 } })),
    outreach: [], tools: [], milestones: [], ...extra,
  } as unknown as UserState;
}
const week = (n: number, social: number, offset: number) => Array.from({ length: n }, (_, i) => ({ daysAgo: offset + (i % 6) + 0.5, social: i < social }));

test("a week that points more at people reads as up", () => {
  const r = weeklyReflection(state([...week(10, 5, 0), ...week(10, 1, 7)]), now);
  assert.equal(r.direction, "up");
  assert.equal(r.thisWeek.here, 10);
  assert.equal(r.thisWeek.people, 5);
});

test("a week that leans inward reads as down, and nothing is scored", () => {
  const r = weeklyReflection(state([...week(10, 1, 0), ...week(10, 6, 7)]), now);
  assert.equal(r.direction, "down");
  assert.equal(r.steadier, false);
  assert.ok(!("score" in r) && !("level" in r) && !("streak" in r));
});

test("too few messages says nothing about direction", () => {
  const r = weeklyReflection(state(week(3, 1, 0)), now);
  assert.equal(r.direction, "quiet");
  assert.equal(r.outward, null);
});

test("fewer check-ins while still showing up counts as steadier", () => {
  const outreach = [{ at: now - 8 * DAY }, { at: now - 9 * DAY }, { at: now - 10 * DAY }] as UserState["outreach"];
  const r = weeklyReflection(state([...week(8, 3, 0), ...week(8, 3, 7)], { outreach }), now);
  assert.equal(r.steadier, true);
});

test("no messages at all does not count as steadier", () => {
  const outreach = [{ at: now - 8 * DAY }] as UserState["outreach"];
  assert.equal(weeklyReflection(state([], { outreach }), now).steadier, false);
});

test("tools are grouped and sorted by use", () => {
  const s = state([], { tools: [{ kind: "box", at: 1 }, { kind: "sigh", at: 2 }, { kind: "box", at: 3 }] });
  assert.deepEqual(toolsSummary(s), [{ kind: "box", count: 2 }, { kind: "sigh", count: 1 }]);
});

test("the insight cue filter skips short or plain messages and passes likely ones", () => {
  assert.equal(worthChecking("lol ok"), false);
  assert.equal(worthChecking("everyone hates me and i'm tired of all of it"), false);
  assert.equal(worthChecking("music on the bus home really does calm me down"), true);
  assert.equal(worthChecking("i'm going to book the counselling slot on thursday"), true);
  assert.equal(worthChecking("நடக்கப் போனா மனசு கொஞ்சம் லேசாகுது"), true);
});
