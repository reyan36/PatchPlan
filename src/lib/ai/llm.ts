// Server-only: Nemotron models on Nebius Token Factory (OpenAI-compatible API).
// Never import this from a client component — it reads the API key.

import { recordTokens, reserveBudget } from "./budget";

const BASE_URL = (process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1").replace(/\/$/, "");

export const MODELS = {
  /** Fast model for sorting, de-duplicating and reranking. */
  small: process.env.NEMOTRON_SMALL_MODEL || "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
  /** Larger model for matching, reasoning and writing. */
  large: process.env.NEMOTRON_LARGE_MODEL || "nvidia/nemotron-3-super-120b-a12b",
};

export type ModelSize = keyof typeof MODELS;

export class AIError extends Error {
  /** Provider response, for server logs and retries only; never shown to users. */
  constructor(message: string, public status = 500, public detail = "") {
    super(message);
  }
}

export function isConfigured() {
  return !!process.env.NEBIUS_API_KEY;
}

type Message = { role: "system" | "user" | "assistant"; content: string };

export async function chat(
  size: ModelSize,
  messages: Message[],
  opts: { temperature?: number; maxTokens?: number; json?: boolean } = {}
): Promise<string> {
  const key = process.env.NEBIUS_API_KEY;
  if (!key) throw new AIError("PatchPlan AI isn't available right now. Please try again later.", 503);
  // Shared daily/monthly cap across all accounts, checked before anything is billed (budget.ts).
  await reserveBudget("llm");

  const send = (thinkingOff: boolean) =>
    fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODELS[size],
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 2048,
        // Nemotron 3 reasons by default; we only want the answer (cheaper and faster).
        ...(thinkingOff ? { chat_template_kwargs: { enable_thinking: false } } : {}),
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(90_000),
    });

  let res = await send(true);
  if (res.status === 400 || res.status === 422) {
    const detail = await res.clone().text().catch(() => "");
    if (/chat_template_kwargs|enable_thinking/i.test(detail)) res = await send(false);
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 500);
    console.error(`[ai] Nebius ${res.status} (${MODELS[size]}): ${detail}`);
    const message =
      res.status === 429 ? "PatchPlan AI is busy right now. Please try again in a minute." : "PatchPlan AI couldn't finish that request. Please try again.";
    throw new AIError(message, res.status === 429 ? 429 : 502, detail);
  }
  const data = await res.json();
  recordTokens(data?.usage);
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Pull the first JSON object out of a model reply (handles <think> blocks and code fences). */
export function extractJson<T>(raw: string): T {
  const text = raw.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/```(?:json)?/g, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new AIError("Model did not return JSON.", 502);
  return JSON.parse(text.slice(start, end + 1)) as T;
}

/** Chat and parse a JSON object; retries once without response_format if the provider rejects it. */
export async function chatJson<T>(size: ModelSize, system: string, user: string, maxTokens = 2048): Promise<T> {
  const messages: Message[] = [
    // Nemotron reasoning models honour this toggle; plain JSON is all we want here.
    { role: "system", content: `${system}\n\nRespond with a single JSON object only. /no_think` },
    { role: "user", content: user },
  ];
  let raw: string;
  try {
    raw = await chat(size, messages, { json: true, maxTokens });
  } catch (err) {
    if (err instanceof AIError && err.status === 502 && /response_format/i.test(err.detail)) {
      raw = await chat(size, messages, { maxTokens });
    } else {
      throw err;
    }
  }
  return extractJson<T>(raw);
}
