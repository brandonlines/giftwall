// Edge Function: send-push
// Triggered by a Supabase Database Webhook on INSERT into public.items.
// Notifies every group member EXCEPT the list owner that a new item was added.
//
// Set up the webhook (Dashboard > Database > Webhooks):
//   Table: items, Events: INSERT, Type: Supabase Edge Function -> send-push
//   Add an HTTP header  x-webhook-secret: <value>  and set the same value as a
//   function secret:  npx supabase secrets set WEBHOOK_SECRET=<value>
//
// Deploy:  npx supabase functions deploy send-push

import { createClient } from "jsr:@supabase/supabase-js@2";

type ItemRecord = { id: string; list_id: string; title: string };
type WebhookPayload = { type: string; table: string; record: ItemRecord };

const EXPO_PUSH = "https://exp.host/--/api/v2/push/send";

// Constant-time compare so the shared secret can't be teased out via response
// timing. This webhook runs with verify_jwt = false, so WEBHOOK_SECRET is its
// ONLY auth gate — worth not leaking.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  // Fail CLOSED: with verify_jwt = false, an unset secret would leave this
  // function completely unauthenticated — and its push title/body come straight
  // from the request payload, so an open endpoint is a push-phishing vector.
  // Refuse to run rather than accept anonymous triggers.
  if (!secret) {
    return new Response("server misconfigured: WEBHOOK_SECRET is not set", { status: 500 });
  }
  if (!safeEqual(req.headers.get("x-webhook-secret") ?? "", secret)) {
    return new Response("unauthorized", { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  if (payload.type !== "INSERT" || payload.table !== "items") {
    return new Response("ignored", { status: 200 });
  }

  // Service role: bypasses RLS so we can read every member's tokens.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const item = payload.record;

  const { data: list } = await admin
    .from("wishlists")
    .select("group_id, owner_id, title")
    .eq("id", item.list_id)
    .single();
  if (!list) return new Response("no list", { status: 200 });

  const { data: members } = await admin
    .from("memberships")
    .select("user_id")
    .eq("group_id", list.group_id)
    .neq("user_id", list.owner_id); // don't notify the recipient about their own item

  const recipientIds = (members ?? []).map((m) => m.user_id);
  if (recipientIds.length === 0) return new Response("no recipients", { status: 200 });

  // Respect notification preferences: skip anyone who turned new_item off. A
  // missing row means opted in (the default), so we exclude only explicit false.
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("user_id, new_item")
    .in("user_id", recipientIds);
  const optedOut = new Set(
    (prefs ?? []).filter((p) => p.new_item === false).map((p) => p.user_id),
  );
  const notifyIds = recipientIds.filter((id) => !optedOut.has(id));
  if (notifyIds.length === 0) return new Response("no recipients", { status: 200 });

  const { data: tokens } = await admin
    .from("push_tokens")
    .select("token")
    .in("user_id", notifyIds);

  const messages = (tokens ?? []).map((t) => ({
    to: t.token,
    sound: "default",
    title: `New gift idea on ${list.title}`,
    body: item.title,
    data: { listId: item.list_id },
  }));

  if (messages.length > 0) {
    const pushRes = await fetch(EXPO_PUSH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    // Prune tokens Expo reports as unregistered (app uninstalled / token
    // rotated) so we stop pushing to dead devices and don't waste quota.
    // Tickets come back in the same order as the messages we sent. Best-effort:
    // never fail the webhook over response parsing.
    try {
      const body = await pushRes.json();
      const tickets = Array.isArray(body?.data) ? body.data : [];
      const dead = messages
        .map((m, i) => (tickets[i]?.details?.error === "DeviceNotRegistered" ? m.to : null))
        .filter((t): t is string => t !== null);
      if (dead.length > 0) {
        await admin.from("push_tokens").delete().in("token", dead);
      }
    } catch {
      // ignore — pruning is a hygiene optimization, not part of delivery
    }
  }

  return new Response(JSON.stringify({ sent: messages.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
