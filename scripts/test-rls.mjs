#!/usr/bin/env node
// Automated Row-Level-Security validation for giftwall.
//
// Creates four real auth users and exercises the schema through PostgREST
// exactly as the app does, asserting the Surprise Wall and every policy. This
// validates the *running* stack (Postgres + RLS + triggers), not just the SQL.
//
//   Alice   – list owner / gift recipient
//   Bob     – group member, buys a gift
//   Carol   – group member, non-buyer (then promoted/removed by admin)
//   Mallory – outsider, never joins the group
//
// Usage:
//   1. Put SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in
//      .env.test (see .env.test.example). The service_role key is required to
//      create/delete test users and is NEVER shipped in the app.
//   2. npm run test:rls
//
// Exits non-zero if any assertion fails. Always cleans up its test data.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- tiny .env.test loader (no dependency) --------------------------------
function loadEnv() {
  try {
    const txt = readFileSync(new URL("../.env.test", import.meta.url), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* fall back to real env */
  }
}
loadEnv();

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error(
    "Missing env. Need SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY " +
      "(put them in .env.test).",
  );
  process.exit(2);
}

const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- assertion harness -----------------------------------------------------
let passed = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const PASSWORD = "giftwall-test-Pw1!";
const stamp = Date.now();
const created = []; // user ids for cleanup
let groupId = null;

async function makeUser(name) {
  const email = `${name.toLowerCase()}+${stamp}@giftwall.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error) throw new Error(`createUser ${name}: ${error.message}`);
  created.push(data.user.id);

  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error: sErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (sErr) throw new Error(`signIn ${name}: ${sErr.message}`);
  return { id: data.user.id, email, client };
}

async function run() {
  console.log("Creating test users…");
  const alice = await makeUser("Alice");
  const bob = await makeUser("Bob");
  const carol = await makeUser("Carol");
  const dave = await makeUser("Dave");
  const mallory = await makeUser("Mallory");

  // --- Alice builds a group, list, items ----------------------------------
  // Group creation goes through the create_group RPC (atomic group + admin
  // membership); direct membership self-insert is no longer permitted.
  const { data: group, error: gErr } = await alice.client.rpc("create_group", {
    p_name: "Test Family",
  });
  if (gErr) throw new Error(`Alice create group: ${gErr.message}`);
  groupId = group.id;

  console.log("\nJoining via invite code…");
  const selfJoin = await mallory.client
    .from("memberships")
    .insert({ group_id: group.id, user_id: mallory.id });
  check("Outsider CANNOT self-join a group by id", !!selfJoin.error, "expected RLS error");
  const join1 = await bob.client.rpc("redeem_invite", { p_code: group.invite_code });
  check("Bob joins with invite code", !join1.error, join1.error?.message);
  const join2 = await carol.client.rpc("redeem_invite", { p_code: group.invite_code });
  check("Carol joins with invite code", !join2.error, join2.error?.message);
  const join3 = await dave.client.rpc("redeem_invite", { p_code: group.invite_code });
  check("Dave joins with invite code", !join3.error, join3.error?.message);
  const badJoin = await mallory.client.rpc("redeem_invite", { p_code: "NOPENOPE" });
  check("Bad invite code is rejected", !!badJoin.error, "expected error");

  const { data: list } = await alice.client
    .from("wishlists")
    .insert({ group_id: group.id, owner_id: alice.id, title: "Alice's List" })
    .select()
    .single();
  const { data: items } = await alice.client
    .from("items")
    .insert([{ list_id: list.id, title: "Headphones" }, { list_id: list.id, title: "Book" }])
    .select();
  const i1 = items[0].id;
  const i2 = items[1].id;

  await bob.client.from("claims").insert({ item_id: i1, buyer_id: bob.id });

  // --- THE SURPRISE WALL ---------------------------------------------------
  console.log("\nSurprise Wall (claims):");
  const aliceClaims = await alice.client.from("claims").select("*").eq("item_id", i1);
  check(
    "Recipient (Alice) CANNOT see claims on her own item",
    (aliceClaims.data?.length ?? 0) === 0,
    `saw ${aliceClaims.data?.length} rows`,
  );
  const bobClaims = await bob.client.from("claims").select("*").eq("item_id", i1);
  check("Buyer (Bob) sees his own claim", (bobClaims.data?.length ?? 0) === 1);
  const carolClaims = await carol.client.from("claims").select("*").eq("item_id", i1);
  check("Other member (Carol) sees the claim exists", (carolClaims.data?.length ?? 0) === 1);
  const malloryClaims = await mallory.client.from("claims").select("*").eq("item_id", i1);
  check("Outsider (Mallory) sees no claims", (malloryClaims.data?.length ?? 0) === 0);

  // --- access scoping ------------------------------------------------------
  console.log("\nGroup access scoping:");
  const malloryItems = await mallory.client.from("items").select("*").eq("list_id", list.id);
  check("Outsider cannot read group items", (malloryItems.data?.length ?? 0) === 0);
  const malloryGroup = await mallory.client.from("groups").select("*").eq("id", group.id);
  check("Outsider cannot read the group", (malloryGroup.data?.length ?? 0) === 0);

  // --- claim insert guards -------------------------------------------------
  console.log("\nClaim insert guards:");
  const aliceClaimOwn = await alice.client.from("claims").insert({ item_id: i2, buyer_id: alice.id });
  check("Recipient CANNOT claim her own item", !!aliceClaimOwn.error, "expected error");
  const carolDup = await carol.client.from("claims").insert({ item_id: i1, buyer_id: carol.id });
  check("Double-claim on same item is rejected", !!carolDup.error, "expected unique error");
  const carolClaim2 = await carol.client.from("claims").insert({ item_id: i2, buyer_id: carol.id });
  check("A different member can claim a different item", !carolClaim2.error, carolClaim2.error?.message);

  // --- multi-quantity claims (split across buyers) -------------------------
  console.log("\nMulti-quantity claims:");
  const { data: multi } = await alice.client
    .from("items")
    .insert({ list_id: list.id, title: "Board game", quantity: 2 })
    .select()
    .single();
  const mq1 = await bob.client.from("claims").insert({ item_id: multi.id, buyer_id: bob.id });
  check("First buyer claims a qty-2 item", !mq1.error, mq1.error?.message);
  const mqDup = await bob.client.from("claims").insert({ item_id: multi.id, buyer_id: bob.id });
  check("Same buyer cannot double-claim", !!mqDup.error, "expected unique error");
  const mq2 = await carol.client.from("claims").insert({ item_id: multi.id, buyer_id: carol.id });
  check("Second buyer claims the qty-2 item", !mq2.error, mq2.error?.message);
  const mq3 = await dave.client.from("claims").insert({ item_id: multi.id, buyer_id: dave.id });
  check("Third buyer rejected once fully claimed (cap)", !!mq3.error, "expected cap error");

  // --- comments ------------------------------------------------------------
  console.log("\nPer-item discussion:");
  const bobComment = await bob.client
    .from("item_comments")
    .insert({ item_id: i1, author_id: bob.id, body: "I'll grab these" });
  check("Member can comment on an item", !bobComment.error, bobComment.error?.message);
  const aliceReadComments = await alice.client.from("item_comments").select("*").eq("item_id", i1);
  check(
    "Recipient CANNOT read comments on her own item",
    (aliceReadComments.data?.length ?? 0) === 0,
  );
  const carolReadComments = await carol.client.from("item_comments").select("*").eq("item_id", i1);
  check("Other member can read the discussion", (carolReadComments.data?.length ?? 0) >= 1);
  const aliceComment = await alice.client
    .from("item_comments")
    .insert({ item_id: i1, author_id: alice.id, body: "peeking" });
  check("Recipient CANNOT post on her own item", !!aliceComment.error, "expected error");
  const malloryComments = await mallory.client.from("item_comments").select("*").eq("item_id", i1);
  check("Outsider cannot read the discussion", (malloryComments.data?.length ?? 0) === 0);

  // --- activity feed -------------------------------------------------------
  console.log("\nActivity feed:");
  const bobActivity = await bob.client.from("activity").select("*").eq("group_id", group.id);
  check("Member sees group activity", (bobActivity.data?.length ?? 0) > 0);
  const malloryActivity = await mallory.client.from("activity").select("*").eq("group_id", group.id);
  check("Outsider sees no activity", (malloryActivity.data?.length ?? 0) === 0);

  // --- profiles ------------------------------------------------------------
  console.log("\nProfiles:");
  const bobSeesAlice = await bob.client.from("profiles").select("*").eq("id", alice.id);
  check("Co-member can read a profile", (bobSeesAlice.data?.length ?? 0) === 1);
  const mallorySeesAlice = await mallory.client.from("profiles").select("*").eq("id", alice.id);
  check("Outsider cannot read a profile", (mallorySeesAlice.data?.length ?? 0) === 0);

  // --- admin management ----------------------------------------------------
  console.log("\nAdmin member management:");
  const bobPromote = await bob.client
    .from("memberships")
    .update({ role: "admin" })
    .eq("group_id", group.id)
    .eq("user_id", carol.id)
    .select();
  check("Non-admin CANNOT change roles", (bobPromote.data?.length ?? 0) === 0);
  const alicePromote = await alice.client
    .from("memberships")
    .update({ role: "admin" })
    .eq("group_id", group.id)
    .eq("user_id", carol.id)
    .select();
  check("Admin can change roles", (alicePromote.data?.length ?? 0) === 1, alicePromote.error?.message);
  const aliceRemove = await alice.client
    .from("memberships")
    .delete()
    .eq("group_id", group.id)
    .eq("user_id", carol.id)
    .select();
  check("Admin can remove a member", (aliceRemove.data?.length ?? 0) === 1);
  const carolAfter = await carol.client.from("items").select("*").eq("list_id", list.id);
  check("Removed member loses access", (carolAfter.data?.length ?? 0) === 0);

  // --- group rename / delete -----------------------------------------------
  console.log("\nGroup rename / delete:");
  const bobRename = await bob.client
    .from("groups")
    .update({ name: "Hacked" })
    .eq("id", group.id)
    .select();
  check("Non-admin CANNOT rename the group", (bobRename.data?.length ?? 0) === 0);
  const aliceRename = await alice.client
    .from("groups")
    .update({ name: "Renamed Family" })
    .eq("id", group.id)
    .select();
  check("Admin can rename the group", (aliceRename.data?.length ?? 0) === 1, aliceRename.error?.message);
  const bobDelete = await bob.client.from("groups").delete().eq("id", group.id).select();
  check("Non-admin CANNOT delete the group", (bobDelete.data?.length ?? 0) === 0);
  // (Admin delete is exercised by cleanup, which removes the group as service role.)
}

async function cleanup() {
  console.log("\nCleaning up…");
  if (groupId) await admin.from("groups").delete().eq("id", groupId);
  for (const id of created) await admin.auth.admin.deleteUser(id);
}

run()
  .catch((e) => {
    failures.push(`FATAL: ${e.message}`);
    console.error("\nFatal error:", e.message);
  })
  .finally(async () => {
    await cleanup().catch((e) => console.error("Cleanup error:", e.message));
    console.log(`\n${passed} passed, ${failures.length} failed.`);
    if (failures.length) {
      console.log("\nFailures:");
      for (const f of failures) console.log("  - " + f);
      process.exit(1);
    }
    console.log("All RLS assertions passed ✅");
    process.exit(0);
  });
