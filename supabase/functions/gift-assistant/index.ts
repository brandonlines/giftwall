// Edge Function: gift-assistant
// Takes details about a recipient and returns ranked, purchasable gift ideas
// from an LLM. Authenticated users only (verify_jwt = true); each caller is
// rate-limited to DAILY_CAP requests/day via the ai_requests table to keep LLM
// cost bounded.
//
// Calls an LLM through the shared _shared/llm.ts client (OpenAI-compatible
// /chat/completions; OpenRouter by default). With no key configured the function
// returns 503 and the app shows a friendly "not set up yet" message, so nothing
// breaks before it's wired.
//
// Secrets:  OPENROUTER_API_KEY (or ANTHROPIC_API_KEY); LLM_MODEL / LLM_BASE_URL optional
// Deploy:   npx supabase functions deploy gift-assistant

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { chat, llmConfigured } from "../_shared/llm.ts";

const DAILY_CAP = 25;

const SYSTEM = [
  "You are a thoughtful, practical gift-shopping assistant.",
  "Given details about a gift recipient, suggest specific, purchasable gift ideas —",
  "real products a person could buy, not vague categories.",
  "Respond with ONLY a JSON array (no prose, no markdown fences) of up to 6 objects,",
  'each exactly: {"title": string, "why": string, "estPrice": string}.',
  '"title" is a specific item; "why" is one short sentence on why it fits;',
  '"estPrice" is an approximate price like "$40". Respect the budget if one is given.',
].join(" ");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Idea = { title: string; why: string; estPrice: string };

function buildPrompt(input: Record<string, unknown>): string {
  const parts: string[] = [];
  const rel = String(input.relationship ?? "").trim();
  const age = String(input.age ?? "").trim();
  const interests = String(input.interests ?? "").trim();
  const occasion = String(input.occasion ?? "").trim();
  const notes = String(input.notes ?? "").trim();
  const budget = String(input.budget ?? "").trim();

  if (rel) parts.push(`Recipient: my ${rel}.`);
  if (age) parts.push(`Age: ${age}.`);
  if (interests) parts.push(`Interests: ${interests}.`);
  if (occasion) parts.push(`Occasion: ${occasion}.`);
  if (budget) parts.push(`Budget: around ${budget}.`);
  if (notes) parts.push(`Extra notes: ${notes}.`);
  if (parts.length === 0) parts.push("Suggest broadly appealing, crowd-pleaser gifts.");
  return parts.join(" ");
}

// Pull the first JSON array out of the model's text and validate its shape.
function parseIdeas(text: string): Idea[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      title: String(x.title ?? "").trim(),
      why: String(x.why ?? "").trim(),
      estPrice: String(x.estPrice ?? "").trim(),
    }))
    .filter((i) => i.title.length > 0)
    .slice(0, 6);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!llmConfigured()) {
    return json({ error: "The gift assistant isn't set up yet. Check back soon!" }, 503);
  }

  // Identify the caller from their JWT (platform already validated it).
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: auth } = await userClient.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return json({ error: "Not signed in" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Per-user daily cap.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_CAP) {
    return json({ error: "You've reached today's idea limit. Try again tomorrow!" }, 429);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — we'll suggest crowd-pleasers
  }

  // Call the LLM (OpenAI-compatible, via _shared/llm.ts).
  let ideas: Idea[] = [];
  try {
    const text = await chat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(body) },
      ],
      { max_tokens: 1024, temperature: 0.4 },
    );
    ideas = parseIdeas(text);
  } catch {
    return json({ error: "Couldn't reach the assistant. Please try again." }, 502);
  }

  if (ideas.length === 0) {
    return json({ error: "No ideas came back — try adding more detail." }, 422);
  }

  // Log the successful request for rate limiting (best-effort).
  await admin.from("ai_requests").insert({ user_id: userId });

  return json({ ideas });
});
