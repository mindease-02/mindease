/**
 * LLM client. OpenAI-compatible chat completions, so the same code talks to
 * Groq (default) or OpenRouter. No SDK - one fetch per call.
 *
 * Two model tiers (defaults are current Groq models; override with LLM_CHAT_MODEL / LLM_FAST_MODEL):
 *   chat - the voice of the companion. Quality matters more than latency.
 *   fast - structured JSON jobs (affect analysis, memory extraction). Called on
 *          every turn, so it should be cheap and quick.
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
  provider: "groq" | "openrouter";
}

export function llmConfig(): LlmConfig | null {
  const groq = process.env.GROQ_API_KEY;
  const openrouter = process.env.OPENROUTER_API_KEY;
  if (openrouter) {
    return {
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: openrouter,
      chatModel: process.env.LLM_CHAT_MODEL ?? "meta-llama/llama-3.3-70b-instruct",
      fastModel: process.env.LLM_FAST_MODEL ?? "meta-llama/llama-3.1-8b-instruct",
    };
  }
  if (groq) {
    return {
      provider: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: groq,
      chatModel: process.env.LLM_CHAT_MODEL ?? "openai/gpt-oss-120b",
      fastModel: process.env.LLM_FAST_MODEL ?? "openai/gpt-oss-20b",
    };
  }
  return null;
}

export interface CompletionOptions {
  tier?: "chat" | "fast";
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

async function post(cfg: LlmConfig, model: string, messages: ChatMessage[], opts: CompletionOptions): Promise<Response> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? (opts.tier === "fast" ? 0.2 : 0.7),
    max_tokens: opts.maxTokens ?? (opts.tier === "fast" ? 900 : 800),
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
  if (!cfg) throw new Error("No LLM configured. Set GROQ_API_KEY (or OPENROUTER_API_KEY).");
  const primary = opts.tier === "fast" ? cfg.fastModel : cfg.chatModel;

  let res = await post(cfg, primary, messages, opts);
  if (res.status === 429) {
    const text = await res.text();
    const wait = retryAfterSeconds(res, text);
    if (wait !== null && wait <= MAX_WAIT_S[opts.tier === "fast" ? "fast" : "chat"]) {
      await sleep(Math.ceil(wait * 1000) + 150);
      res = await post(cfg, primary, messages, opts);
    } else {
      throw new Error(`LLM 429: ${text.slice(0, 300)}`);
    }
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
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

/** Groq-hosted Whisper. Audio never touches any other service. */
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
