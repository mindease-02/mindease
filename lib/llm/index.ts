/**
 * LLM client. One fetch per call, no SDK. Talks to Anthropic (preferred when
 * ANTHROPIC_API_KEY is set), or to Groq / OpenRouter through their
 * OpenAI-compatible chat completions.
 *
 * Three model tiers (override with LLM_CHAT_MODEL / LLM_FAST_MODEL / LLM_SAFETY_MODEL):
 *   chat   - the voice of the companion. Quality matters more than latency.
 *   fast   - structured JSON jobs (affect analysis, memory extraction). Called on
 *            every turn, so it should be cheap and quick.
 *   safety - the crisis second opinion. Accuracy first.
 *
 * On Anthropic the long system prompt is marked for prompt caching, so the
 * persona is billed once per five minutes rather than on every turn.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  fastModel: string;
  /** The safety second opinion. On Groq this is a third model so it never queues behind the others: rate limits there are per model. */
  safetyModel: string;
  provider: "anthropic" | "groq" | "openrouter";
}

export function llmConfig(prefer?: "groq"): LlmConfig | null {
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const groq = process.env.GROQ_API_KEY;
  const openrouter = process.env.OPENROUTER_API_KEY;
  const forced = prefer ?? process.env.LLM_PROVIDER;
  if (anthropic && (!forced || forced === "anthropic")) {
    return {
      provider: "anthropic",
      baseUrl: "https://api.anthropic.com/v1",
      apiKey: anthropic,
      chatModel: process.env.LLM_CHAT_MODEL ?? "claude-sonnet-5",
      fastModel: process.env.LLM_FAST_MODEL ?? "claude-haiku-4-5-20251001",
      safetyModel: process.env.LLM_SAFETY_MODEL ?? "claude-sonnet-5",
    };
  }
  if (openrouter && (!forced || forced === "openrouter")) {
    return {
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: openrouter,
      chatModel: process.env.LLM_CHAT_MODEL ?? "meta-llama/llama-3.3-70b-instruct",
      fastModel: process.env.LLM_FAST_MODEL ?? "meta-llama/llama-3.1-8b-instruct",
      safetyModel: process.env.LLM_SAFETY_MODEL ?? process.env.LLM_FAST_MODEL ?? "meta-llama/llama-3.1-8b-instruct",
    };
  }
  if (groq && (!forced || forced === "groq")) {
    return {
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: groq,
      chatModel: process.env.LLM_CHAT_MODEL ?? "openai/gpt-oss-120b",
      fastModel: process.env.LLM_FAST_MODEL ?? "openai/gpt-oss-20b",
      // Scored 8/10 against gpt-oss-20b's 7/10 on the triage eval, and has its own free-tier budget.
      safetyModel: process.env.LLM_SAFETY_MODEL ?? "qwen/qwen3.8-27b",
    };
  }
  return null;
}

export interface CompletionOptions {
  tier?: "chat" | "fast" | "safety";
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  signal?: AbortSignal;
}

/** Seconds Groq asks us to wait on a 429, from the header or the message; null when it does not say. */
function retryAfterSeconds(res: Response, body: string): number | null {
  const h = Number(res.headers.get("retry-after"));
  if (Number.isFinite(h) && h > 0) return h;
  const m = /try again in (?:(\d+)m)?([\d.]+)(ms|s)/i.exec(body);
  if (!m) return null;
  const n = Number(m[2]);
  return (Number(m[1] ?? 0) * 60) + (m[3].toLowerCase() === "ms" ? n / 1000 : n);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Longest we will wait inside one request for a rate-limit window to reopen. Replies wait longer than background jobs. */
const MAX_WAIT_S = { fast: 6, chat: 12 } as const;

const JSON_ONLY = "Reply with one JSON object and nothing else: no prose before or after it, no code fence.";

/**
 * Anthropic's Messages API: system apart from the turns, turns strictly
 * alternating user/assistant, the first one from the user. For JSON jobs the
 * assistant turn is prefilled with "{" so the reply is the object itself.
 */
function anthropicBody(model: string, messages: ChatMessage[], opts: CompletionOptions): Record<string, unknown> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content.trim()).filter(Boolean).join("\n\n");
  const turns: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    const content = m.content.trim(); if (!content) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + content; else turns.push({ role: m.role, content });
  }
  if (!turns.length || turns[0].role !== "user") turns.unshift({ role: "user", content: "(begin)" });
  if (opts.json) {
    if (turns[turns.length - 1].role === "assistant") turns[turns.length - 1].content += "\n\n{"; else turns.push({ role: "assistant", content: "{" });
  }
  const sys = (opts.json ? `${system}\n\n${JSON_ONLY}` : system).trim();
  return {
    model,
    max_tokens: opts.maxTokens ?? (opts.tier === "chat" || !opts.tier ? 800 : 900),
    temperature: opts.temperature ?? (opts.tier === "chat" || !opts.tier ? 0.7 : 0.2),
    // The persona is long and the same on every turn: cache it.
    ...(sys ? { system: [{ type: "text", text: sys, ...(sys.length > 2000 ? { cache_control: { type: "ephemeral" } } : {}) }] } : {}),
    messages: turns,
  };
}

async function post(cfg: LlmConfig, model: string, messages: ChatMessage[], opts: CompletionOptions): Promise<Response> {
  if (cfg.provider === "anthropic") {
    return fetch(`${cfg.baseUrl}/messages`, {
      method: "POST",
      headers: { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify(anthropicBody(model, messages, opts)),
      signal: opts.signal,
    });
  }
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? (opts.tier === "chat" || !opts.tier ? 0.7 : 0.2),
    max_tokens: opts.maxTokens ?? (opts.tier === "chat" || !opts.tier ? 800 : 900),
  };
  if (opts.json) body.response_format = { type: "json_object" };
  // gpt-oss models reason before answering; keep that short so it neither eats
  // the token budget nor adds seconds of latency to a two-line reply.
  if (/gpt-oss/.test(model)) body.reasoning_effort = "low";
  return fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      ...(cfg.provider === "openrouter" ? { "X-Title": "MindEase" } : {}),
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
}

/**
 * One completion. On a rate limit it waits, if the provider says the window
 * reopens soon, and tries once more. Background jobs never borrow the chat
 * model's budget: replies need it more, and a crisis reply most of all.
 */
export async function complete(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  const cfg = llmConfig();
  if (!cfg) throw new Error("No LLM configured. Set ANTHROPIC_API_KEY (or GROQ_API_KEY / OPENROUTER_API_KEY).");
  const primary = opts.tier === "fast" ? cfg.fastModel : opts.tier === "safety" ? cfg.safetyModel : cfg.chatModel;

  let res = await post(cfg, primary, messages, opts);
  if (res.status === 529) {
    // Anthropic is briefly overloaded: one short wait, then try again.
    await res.text(); await sleep(1500);
    res = await post(cfg, primary, messages, opts);
  }
  if (res.status === 429) {
    const text = await res.text();
    const wait = retryAfterSeconds(res, text);
    if (wait !== null && wait <= MAX_WAIT_S[opts.tier === "chat" || !opts.tier ? "chat" : "fast"]) {
      await sleep(Math.ceil(wait * 1000) + 150);
      res = await post(cfg, primary, messages, opts);
    } else if (opts.tier === "safety" && cfg.safetyModel !== cfg.fastModel) {
      // The safety model is out of budget: the fast model takes the triage rather than skipping it.
      res = await post(cfg, cfg.fastModel, messages, opts);
    } else {
      throw new Error(`LLM 429: ${text.slice(0, 300)}`);
    }
  }
  if (!res.ok && cfg.provider === "anthropic" && res.status !== 429 && process.env.GROQ_API_KEY) {
    // Anthropic refused (billing, an outage, a bad model id): the Groq fallback answers rather than nobody.
    const text = await res.text();
    console.warn(`LLM anthropic ${res.status}, falling back to groq: ${text.slice(0, 160)}`);
    const back = llmConfig("groq");
    if (back) {
      const model = opts.tier === "fast" ? back.fastModel : opts.tier === "safety" ? back.safetyModel : back.chatModel;
      const r2 = await post(back, model, messages, opts);
      if (!r2.ok) throw new Error(`LLM ${r2.status}: ${(await r2.text()).slice(0, 300)}`);
      const j2 = (await r2.json()) as { choices?: { message?: { content?: string } }[] };
      return j2.choices?.[0]?.message?.content?.trim() ?? "";
    }
    throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
  }
  if (cfg.provider === "anthropic") {
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
    return opts.json && !text.startsWith("{") ? `{${text}` : text;
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Parse a JSON object out of a model reply, tolerating code fences and prose. */
export function parseJsonObject<T>(text: string): T | null {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(trimmed) as T; } catch { /* fall through */ }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)) as T; } catch { return null; }
  }
  return null;
}

/** Groq-hosted Whisper. Audio never touches any other service. Anthropic has no speech-to-text, so the Groq key stays for this. */
export async function transcribe(file: Blob, filename = "audio.webm", language?: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is required for speech-to-text.");
  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "json");
  form.append("temperature", "0");
  if (language) form.append("language", language);
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}
