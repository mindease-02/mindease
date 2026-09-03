/**
 * LLM client. OpenAI-compatible chat completions, so the same code talks to
 * Groq (default) or OpenRouter. No SDK - one fetch per call.
 *
 * Two model tiers:
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
      chatModel: process.env.LLM_CHAT_MODEL ?? "llama-3.3-70b-versatile",
      fastModel: process.env.LLM_FAST_MODEL ?? "llama-3.1-8b-instant",
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

export async function complete(messages: ChatMessage[], opts: CompletionOptions = {}): Promise<string> {
  const cfg = llmConfig();
  if (!cfg) throw new Error("No LLM configured. Set GROQ_API_KEY (or OPENROUTER_API_KEY).");
  const model = opts.tier === "fast" ? cfg.fastModel : cfg.chatModel;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? (opts.tier === "fast" ? 0.2 : 0.7),
    max_tokens: opts.maxTokens ?? (opts.tier === "fast" ? 600 : 500),
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      ...(cfg.provider === "openrouter" ? { "X-Title": "MindEase" } : {}),
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
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
export async function transcribe(file: Blob, filename = "audio.webm"): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is required for speech-to-text.");
  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "json");
  form.append("temperature", "0");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}
