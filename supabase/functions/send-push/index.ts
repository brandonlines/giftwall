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

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (secret && req.headers.get("x-webhook-secret") !== secret) {
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

  const { data: tokens } = await admin
    .from("push_tokens")
    .select("token")
    .in("user_id", recipientIds);

  const messages = (tokens ?? []).map((t) => ({
    to: t.token,
    sound: "default",
    title: `New gift idea on ${list.title}`,
    body: item.title,
    data: { listId: item.list_id },
  }));

  if (messages.length > 0) {
    await fetch(EXPO_PUSH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  }

  return new Response(JSON.stringify({ sent: messages.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
