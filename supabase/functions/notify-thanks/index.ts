// Edge Function: notify-thanks
// Triggered by a Database Webhook on INSERT into public.thank_yous. Pushes the
// giver (to_id) a notification that they received a thank-you.
//
// Set up the webhook (Dashboard > Database > Webhooks):
//   Table: thank_yous, Events: INSERT, Type: Supabase Edge Function -> notify-thanks
//   Header  x-webhook-secret: <WEBHOOK_SECRET>  (same secret as send-push).
//
// Deploy:  npx supabase functions deploy notify-thanks

import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH = "https://exp.host/--/api/v2/push/send";

type ThankRecord = { item_id: string; from_id: string; to_id: string; message: string };
type WebhookPayload = { type: string; table: string; record: ThankRecord };

// Constant-time compare (sole auth gate; mirrors send-push).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (!secret) {
    return new Response("server misconfigured: WEBHOOK_SECRET is not set", { status: 500 });
  }
  if (!safeEqual(req.headers.get("x-webhook-secret") ?? "", secret)) {
    return new Response("unauthorized", { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  if (payload.type !== "INSERT" || payload.table !== "thank_yous") {
    return new Response("ignored", { status: 200 });
  }
  const t = payload.record;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [fromProfile, item, tokensRes] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", t.from_id).maybeSingle(),
    admin.from("items").select("title").eq("id", t.item_id).maybeSingle(),
    admin.from("push_tokens").select("token").eq("user_id", t.to_id),
  ]);
  const fromName = fromProfile.data?.display_name ?? "Someone";
  const itemTitle = item.data?.title ?? "your gift";

  const messages = (tokensRes.data ?? []).map((tok) => ({
    to: tok.token,
    sound: "default",
    title: `🙏 ${fromName} said thanks`,
    body: t.message?.trim() || `for ${itemTitle}`,
    data: { kind: "thanks", itemId: t.item_id },
  }));
  if (messages.length === 0) return new Response("no tokens", { status: 200 });

  const pushRes = await fetch(EXPO_PUSH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  // Prune tokens Expo reports as unregistered (same hygiene as send-push).
  try {
    const body = await pushRes.json();
    const tickets = Array.isArray(body?.data) ? body.data : [];
    const dead = messages
      .map((m, i) => (tickets[i]?.details?.error === "DeviceNotRegistered" ? m.to : null))
      .filter((x): x is string => x !== null);
    if (dead.length > 0) await admin.from("push_tokens").delete().in("token", dead);
  } catch {
    // best-effort
  }

  return new Response(JSON.stringify({ sent: messages.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
