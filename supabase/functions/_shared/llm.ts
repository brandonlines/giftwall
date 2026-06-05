// Shared LLM client for Edge Functions.
//
// Primary: Google Gemini (generativelanguage API) when GEMINI_API_KEY is set.
// Fallback: any OpenAI-compatible /chat/completions endpoint (OpenRouter, OpenAI,
//           Groq, a local gateway) when OPENROUTER_API_KEY is set instead.
//
// Env:
//   GEMINI_API_KEY      Google AI Studio key (preferred). Its presence selects Gemini.
//   GEMINI_MODEL        default gemini-2.0-flash
//   OPENROUTER_API_KEY  fallback bearer key (falls back further to ANTHROPIC_API_KEY)
//   LLM_BASE_URL        default https://openrouter.ai/api/v1   (fallback path only)
//   LLM_MODEL           default meta-llama/llama-3.3-70b-instruct:free (fallback only)
//
// With no key set, llmConfigured() is false and callers should 503 gracefully
// rather than calling chat().

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";

const OAI_BASE_URL = Deno.env.get("LLM_BASE_URL") ?? "https://openrouter.ai/api/v1";
const OAI_API_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY");
const OAI_MODEL = Deno.env.get("LLM_MODEL") ?? "meta-llama/llama-3.3-70b-instruct:free";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** True when some provider key is configured, so callers can fail soft. */
export function llmConfigured(): boolean {
  return !!(GEMINI_API_KEY || OAI_API_KEY);
}

/** Returns the model's reply as raw text (callers parse it). Prefers Gemini. */
export async function chat(
  messages: ChatMessage[],
  opts: { max_tokens?: number; temperature?: number } = {},
): Promise<string> {
  return GEMINI_API_KEY ? geminiChat(messages, opts) : openAiChat(messages, opts);
}

// --- Google Gemini (generativelanguage v1beta) ---
// Gemini keeps the system instruction separate from the conversation turns and
// names its own turns "model" (not "assistant"). We force JSON output so callers
// that expect a JSON array parse cleanly (no markdown fences).
async function geminiChat(
  messages: ChatMessage[],
  opts: { max_tokens?: number; temperature?: number },
): Promise<string> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": GEMINI_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
        contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.max_tokens ?? 1000,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((p: { text?: string }) => p?.text ?? "").join("");
  }
  return "";
}

// --- OpenAI-compatible fallback (OpenRouter et al.) ---
async function openAiChat(
  messages: ChatMessage[],
  opts: { max_tokens?: number; temperature?: number },
): Promise<string> {
  const res = await fetch(`${OAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OAI_API_KEY}`,
      "Content-Type": "application/json",
      // OpenRouter uses these for attribution / abuse detection; harmless elsewhere.
      "HTTP-Referer": "https://www.gift-well.ca",
      "X-Title": "giftwall",
    },
    body: JSON.stringify({
      model: OAI_MODEL,
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
