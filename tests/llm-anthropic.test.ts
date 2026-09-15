import { test } from "node:test";
import assert from "node:assert/strict";
import { complete, llmConfig } from "../lib/llm";

type Call = { url: string; init: RequestInit };
function stubFetch(responses: { status: number; body: unknown; headers?: Record<string, string> }[]) {
  const calls: Call[] = [];
  const orig = globalThis.fetch;
  let i = 0;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const r = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "content-type": "application/json", ...(r.headers ?? {}) } });
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = orig; } };
}
const withEnv = async (env: Record<string, string | undefined>, fn: () => Promise<void>) => {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) { prev[k] = process.env[k]; if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k]; }
  try { await fn(); } finally { for (const k of Object.keys(env)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
};
const ENV = { ANTHROPIC_API_KEY: "test-key", GROQ_API_KEY: "groq-key", OPENROUTER_API_KEY: undefined, LLM_PROVIDER: undefined, LLM_CHAT_MODEL: undefined, LLM_FAST_MODEL: undefined, LLM_SAFETY_MODEL: undefined };

test("Anthropic is preferred when its key is set; Groq stays the fallback", async () => {
  await withEnv(ENV, async () => {
    const cfg = llmConfig();
    assert.equal(cfg?.provider, "anthropic");
    assert.equal(cfg?.chatModel, "claude-sonnet-5");
    assert.equal(cfg?.fastModel, "claude-haiku-4-5-20251001");
  });
  await withEnv({ ...ENV, LLM_PROVIDER: "groq" }, async () => { assert.equal(llmConfig()?.provider, "groq"); });
  await withEnv({ ...ENV, ANTHROPIC_API_KEY: undefined }, async () => { assert.equal(llmConfig()?.provider, "groq"); });
});

test("a chat turn becomes a Messages call: system apart and cached, turns alternating, the first from the user", async () => {
  await withEnv(ENV, async () => {
    const f = stubFetch([{ status: 200, body: { content: [{ type: "text", text: "  Hey. What's today been like?  " }] } }]);
    try {
      const persona = "You are MindEase. ".repeat(200);
      const out = await complete([
        { role: "system", content: persona }, { role: "system", content: "Reply language: English." },
        { role: "assistant", content: "Hi." }, { role: "user", content: "long day" }, { role: "user", content: "really long" },
      ], { tier: "chat", maxTokens: 120, temperature: 0.5 });
      assert.equal(out, "Hey. What's today been like?");
      const c = f.calls[0];
      assert.equal(c.url, "https://api.anthropic.com/v1/messages");
      const h = c.init.headers as Record<string, string>;
      assert.equal(h["x-api-key"], "test-key"); assert.equal(h["anthropic-version"], "2023-06-01"); assert.equal(h.Authorization, undefined);
      const body = JSON.parse(String(c.init.body));
      assert.equal(body.model, "claude-sonnet-5"); assert.equal(body.max_tokens, 120); assert.equal(body.temperature, 0.5);
      assert.equal(body.system[0].type, "text"); assert.ok(body.system[0].text.startsWith("You are MindEase.")); assert.ok(body.system[0].text.endsWith("Reply language: English."));
      assert.deepEqual(body.system[0].cache_control, { type: "ephemeral" });
      assert.deepEqual(body.messages.map((m: { role: string }) => m.role), ["user", "assistant", "user"]);
      assert.equal(body.messages[2].content, "long day\n\nreally long");
      assert.equal(body.response_format, undefined);
    } finally { f.restore(); }
  });
});

test("JSON jobs go to the fast model with a prefilled brace, and the brace comes back on the reply", async () => {
  await withEnv(ENV, async () => {
    const f = stubFetch([{ status: 200, body: { content: [{ type: "text", text: '"axes":{"joy":0.1},"confidence":0.4}' }] } }]);
    try {
      const out = await complete([{ role: "system", content: "Analyse." }, { role: "user", content: "fine, tired" }], { tier: "fast", json: true });
      assert.deepEqual(JSON.parse(out), { axes: { joy: 0.1 }, confidence: 0.4 });
      const body = JSON.parse(String(f.calls[0].init.body));
      assert.equal(body.model, "claude-haiku-4-5-20251001");
      assert.ok(body.system[0].text.includes("one JSON object"));
      assert.equal(body.system[0].cache_control, undefined);
      assert.deepEqual(body.messages[body.messages.length - 1], { role: "assistant", content: "{" });
    } finally { f.restore(); }
  });
});

test("a rate limit with a short retry-after waits and tries again; an overload retries once", async () => {
  await withEnv(ENV, async () => {
    const f = stubFetch([{ status: 429, body: { error: "rate" }, headers: { "retry-after": "1" } }, { status: 200, body: { content: [{ type: "text", text: "ok" }] } }]);
    try { assert.equal(await complete([{ role: "user", content: "hi" }], { tier: "chat" }), "ok"); assert.equal(f.calls.length, 2); } finally { f.restore(); }
    const g = stubFetch([{ status: 529, body: { error: "overloaded" } }, { status: 200, body: { content: [{ type: "text", text: "ok2" }] } }]);
    try { assert.equal(await complete([{ role: "user", content: "hi" }], { tier: "fast" }), "ok2"); assert.equal(g.calls.length, 2); } finally { g.restore(); }
  });
});

test("the safety tier falls back to the fast model when its own is out of budget", async () => {
  await withEnv(ENV, async () => {
    const f = stubFetch([{ status: 429, body: { error: "rate" } }, { status: 200, body: { content: [{ type: "text", text: '"tier":"none"}' }] } }]);
    try {
      const out = await complete([{ role: "user", content: "hi" }], { tier: "safety", json: true });
      assert.deepEqual(JSON.parse(out), { tier: "none" });
      assert.equal(JSON.parse(String(f.calls[0].init.body)).model, "claude-sonnet-5");
      assert.equal(JSON.parse(String(f.calls[1].init.body)).model, "claude-haiku-4-5-20251001");
    } finally { f.restore(); }
  });
});

test("when Anthropic refuses for a reason other than rate limits, the Groq fallback answers", async () => {
  await withEnv(ENV, async () => {
    const f = stubFetch([{ status: 400, body: { error: { message: "credit balance too low" } } }, { status: 200, body: { choices: [{ message: { content: "from groq" } }] } }]);
    const warn = console.warn; console.warn = () => {};
    try {
      assert.equal(await complete([{ role: "user", content: "hi" }], { tier: "chat" }), "from groq");
      assert.equal(f.calls.length, 2);
      assert.ok(f.calls[1].url.startsWith("https://api.groq.com/"));
      assert.equal(JSON.parse(String(f.calls[1].init.body)).model, "openai/gpt-oss-120b");
    } finally { f.restore(); console.warn = warn; }
  });
});
