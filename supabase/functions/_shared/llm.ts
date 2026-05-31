// Shared LLM client for Edge Functions. Speaks the OpenAI-compatible
// /chat/completions shape, so it works with OpenRouter (default), OpenAI,
// Together, Groq, a local gateway — anything that endpoint-matches.
//
// Env:
//   OPENROUTER_API_KEY  (falls back to ANTHROPIC_API_KEY) — the bearer key
//   LLM_BASE_URL        default https://openrouter.ai/api/v1
//   LLM_MODEL           default meta-llama/llama-3.3-70b-instruct:free
//
// With no key set, llmConfigured() is false and callers should 503 gracefully
// rather than calling chat().

const BASE_URL = Deno.env.get("LLM_BASE_URL") ?? "https://openrouter.ai/api/v1";
const API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("LLM_MODEL") ?? "meta-llama/llama-3.3-70b-instruct:free";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** True when an API key is configured, so callers can fail soft before calling. */
export function llmConfigured(): boolean {
  return !!API_KEY;
}

export async function chat(
  messages: ChatMessage[],
  opts: { max_tokens?: number; temperature?: number } = {},
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      // OpenRouter uses these for attribution / abuse detection; harmless elsewhere.
      "HTTP-Referer": "https://www.gift-well.ca",
      "X-Title": "giftwall",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: opts.max_tokens ?? 1000,
      temperature: opts.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "") as string;
}
