// Edge Function: delete-account
// Permanently deletes the calling user's account. Apple/Google require an
// in-app account-deletion path for apps with sign-in.
//
// The caller is identified from their own JWT; the service role then deletes
// the auth user, which cascades their profile, memberships, wishlists, items,
// claims, comments and push tokens (groups they created have created_by set to
// NULL — see migration 0010 — so the group survives for remaining members).
//
// Deploy:  npx supabase functions deploy delete-account
// (verify_jwt = true in config.toml gates it to authenticated callers.)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;

  // Identify the caller from their own token.
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

  // Delete with the service role (cascades their data).
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.auth.admin.deleteUser(userData.user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ deleted: true });
});
