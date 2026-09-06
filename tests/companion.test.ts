import { test } from "node:test";
import assert from "node:assert/strict";
import { AVATARS, avatarById, resolveLook } from "../lib/companion/avatars";
import { VOICES } from "../lib/companion/voices";
import { EXPRESSIONS } from "../lib/companion/types";
import { defaultSettings, sanitizeSettings, addressName } from "../lib/companion/profile";
import { companionBlock, previewLines, FORBIDDEN_PHRASES } from "../lib/companion/prompt";
import { memoryCompanionStore } from "../lib/companion/store";
import { buildSystemPrompt } from "../lib/prompt/persona";

test("avatar registry is internally consistent", () => {
  assert.ok(AVATARS.length >= 4);
  const presentations = new Set(AVATARS.map((a) => a.presentation));
  assert.ok(presentations.has("female") && presentations.has("male") && presentations.has("neutral"));
  for (const a of AVATARS) {
    assert.ok(a.expressions.length === EXPRESSIONS.length, `${a.id} supports every expression`);
    for (const v of a.voices) assert.ok(VOICES.some((x) => x.id === v), `${a.id} voice ${v} exists`);
    assert.ok(a.styles.length >= 1 && a.styles[0].id);
    assert.ok(a.styles.every((s) => resolveLook(a, s.id).skin));
  }
  assert.equal(avatarById("nope").id, AVATARS[0].id);
});

test("settings are clamped and unknown values fall back to the avatar default", () => {
  const s = sanitizeSettings({ name: "  Zed  ", pronouns: "xe", appearance: { avatarId: "rishi", style: "bogus", background: "mars", animation: "max" }, personality: { energy: 9, playful: -1 }, voice: { voiceId: "nope", speed: 5, volume: -3 }, conversation: { length: "epic", emojis: "lots" }, address: { mode: "custom", nickname: "captain" }, relationship: "boss", interests: ["a", "", "b"] });
  assert.equal(s.name, "Zed");
  assert.equal(s.pronouns, "he");
  assert.equal(s.appearance.style, "everyday");
  assert.equal(s.appearance.background, "ember");
  assert.equal(s.appearance.animation, "normal");
  assert.equal(s.personality.energy, 1);
  assert.equal(s.personality.playful, 0);
  assert.equal(s.voice.voiceId, "calm-m");
  assert.equal(s.voice.speed, 1.3);
  assert.equal(s.voice.volume, 0);
  assert.equal(s.conversation.length, "normal");
  assert.equal(s.conversation.emojis, "lots");
  assert.equal(s.relationship, "friend");
  assert.deepEqual(s.interests, ["a", "b"]);
  assert.equal(addressName(s, "Priya Sharma"), "captain");
  assert.equal(addressName({ ...s, address: { mode: "none" } }, "Priya Sharma"), null);
  assert.equal(addressName({ ...s, address: { mode: "first" } }, "Priya Sharma"), "Priya");
});

test("companion block carries the name, style and boundaries, and the persona keeps its core", () => {
  const s = { ...defaultSettings("mika"), name: "Kit", conversation: { ...defaultSettings("mika").conversation, emojis: "none" as const } };
  const block = companionBlock(s, "Sam", [{ id: "m1", userId: "u", companionId: "c", memory: "Their cat is called Biscuit.", kind: "fact", importance: 0.4, createdAt: 0, updatedAt: 0 }]);
  assert.match(block, /You are Kit/);
  assert.match(block, /they\/them/);
  assert.match(block, /No emojis at all/);
  assert.match(block, /Biscuit/);
  assert.match(block, /bridge, not a destination/);
  for (const p of FORBIDDEN_PHRASES) assert.ok(block.includes(`"${p}"`), `forbids ${p}`);
  const system = buildSystemPrompt({ allowBehaviouralSignals: false, displayName: "Sam", companion: { name: "Kit", block } });
  assert.match(system, /^You are Kit: a companion/);
  assert.match(system, /You are software/);
  assert.match(system, /## Risk/);
});

test("preview is deterministic and respects the style choices", () => {
  const base = defaultSettings("balaji");
  const short = previewLines({ ...base, conversation: { ...base.conversation, length: "short", casual: true } }, "Sam");
  assert.equal(short.length, 4);
  assert.equal(short[3].content, "yeah. those days happen.");
  const listening = previewLines({ ...base, conversation: { ...base.conversation, questions: "listening" } }, "Sam");
  assert.ok(!listening[3].content.includes("?"));
});

test("memory store: delete one, forget all, and users never see each other", async () => {
  const st = memoryCompanionStore();
  const a = await st.saveProfile("user-a", defaultSettings("akshaya"));
  const b = await st.saveProfile("user-b", defaultSettings("rishi"));
  await st.addMemories("user-a", a.id, [{ memory: "Likes lo-fi while studying.", kind: "preference", importance: 0.5 }, { memory: "Has an exam on Monday.", kind: "event", importance: 0.6 }]);
  await st.addMemories("user-b", b.id, [{ memory: "Plays football on Sundays.", kind: "routine", importance: 0.5 }]);
  // Duplicates are folded.
  await st.addMemories("user-a", a.id, [{ memory: "likes lo-fi while studying", kind: "preference", importance: 0.5 }]);
  const mine = await st.listMemories("user-a", a.id);
  assert.equal(mine.length, 2);
  // Cross-user access by id fails.
  assert.equal(await st.deleteMemory("user-b", mine[0].id), false);
  assert.equal((await st.listMemories("user-a", a.id)).length, 2);
  assert.equal((await st.listMemories("user-b", a.id)).length, 0);
  // Own delete works and is gone from the next read.
  assert.equal(await st.deleteMemory("user-a", mine[0].id), true);
  assert.equal((await st.listMemories("user-a", a.id)).length, 1);
  assert.equal(await st.clearMemories("user-a", a.id), 1);
  assert.equal((await st.listMemories("user-a", a.id)).length, 0);
  assert.equal((await st.listMemories("user-b", b.id)).length, 1);
});

test("message store keeps transcripts per user and clears on request", async () => {
  const st = memoryCompanionStore();
  const a = await st.saveProfile("user-a", defaultSettings("akshaya"));
  await st.addMessages("user-a", a.id, [{ role: "user", content: "hi", createdAt: 1 }, { role: "assistant", content: "hey", createdAt: 2 }]);
  assert.equal((await st.listMessages("user-a", a.id, 10)).length, 2);
  assert.equal((await st.listMessages("user-b", a.id, 10)).length, 0);
  assert.equal(await st.clearMessages("user-a", a.id), 2);
  assert.equal((await st.listMessages("user-a", a.id, 10)).length, 0);
  await st.deleteProfile("user-a");
  assert.equal(await st.getProfile("user-a"), null);
});
