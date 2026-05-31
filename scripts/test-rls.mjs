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
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// --- tiny .env.test loader (no dependency) --------------------------------
// Reads KEY=value lines from .env.test into process.env without clobbering vars
// already set in the real environment (e.g. provided by CI).
// NOTE: resolve the path with fileURLToPath, NOT `new URL(...)` — this module
// declares `const URL` below, so referencing the global URL here would hit that
// binding's temporal dead zone, throw, and (caught) silently skip the file.
function loadEnv() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [resolve(here, "../.env.test"), resolve(process.cwd(), ".env.test")];
  for (const file of candidates) {
    let txt;
    try {
      txt = readFileSync(file, "utf8");
    } catch {
      continue; // not at this path — try the next (the file may be absent in CI)
    }
    for (const line of txt.split(/\r?\n/)) {
      if (/^\s*#/.test(line)) continue; // skip comments
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
    return;
  }
}
loadEnv();

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  const state = (v) => (v ? "set" : "MISSING");
  console.error(
    "Missing env. Put SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in " +
      ".env.test (see .env.test.example).\n" +
      `  SUPABASE_URL=${state(URL)}  SUPABASE_ANON_KEY=${state(ANON)}  ` +
      `SUPABASE_SERVICE_ROLE_KEY=${state(SERVICE)}`,
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

  // --- Hardening: the anonymous role must not be able to invoke the app's
  // authenticated-only RPCs at all (migration 0021 revokes EXECUTE from PUBLIC
  // and re-grants only to authenticated/service_role). -----------------------
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const anonCreate = await anon.rpc("create_group", { p_name: "anon-should-fail" });
  check("Anon CANNOT call create_group RPC", !!anonCreate.error, "expected permission denied");
  const anonDraw = await anon.rpc("draw_secret_santa", {
    p_group_id: "00000000-0000-0000-0000-000000000000",
  });
  check("Anon CANNOT call draw_secret_santa RPC", !!anonDraw.error, "expected permission denied");

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
  // --- group gifting (contributions) — Surprise Wall applies ---------------
  console.log("\nGroup gifting (contributions):");
  await bob.client
    .from("contributions")
    .insert({ item_id: i1, contributor_id: bob.id, amount_cents: 2500 });
  const aliceContribs = await alice.client.from("contributions").select("*").eq("item_id", i1);
  check(
    "Recipient (Alice) CANNOT see contributions on her own item",
    (aliceContribs.data?.length ?? 0) === 0,
    "SURPRISE WALL BREACH",
  );
  const carolContribs = await carol.client.from("contributions").select("*").eq("item_id", i1);
  check("Member (Carol) sees the contribution", (carolContribs.data?.length ?? 0) >= 1);
  const malloryContribs = await mallory.client.from("contributions").select("*").eq("item_id", i1);
  check("Outsider (Mallory) sees no contributions", (malloryContribs.data?.length ?? 0) === 0);
  const aliceChipOwn = await alice.client
    .from("contributions")
    .insert({ item_id: i1, contributor_id: alice.id, amount_cents: 1000 });
  check("Recipient CANNOT chip in on her own item", !!aliceChipOwn.error, "expected error");
  const malloryChip = await mallory.client
    .from("contributions")
    .insert({ item_id: i1, contributor_id: mallory.id, amount_cents: 1000 });
  check("Outsider CANNOT chip in", !!malloryChip.error, "expected error");
  const bobUpdate = await bob.client
    .from("contributions")
    .update({ amount_cents: 4000 })
    .eq("item_id", i1)
    .eq("contributor_id", bob.id)
    .select();
  check("Contributor can update their own pledge", (bobUpdate.data?.length ?? 0) === 1, bobUpdate.error?.message);
  const carolEditsBob = await carol.client
    .from("contributions")
    .update({ amount_cents: 1 })
    .eq("item_id", i1)
    .eq("contributor_id", bob.id)
    .select();
  check("A member CANNOT edit someone else's pledge", (carolEditsBob.data?.length ?? 0) === 0);

  // --- Post-occasion reveal (TWO-PARTY opt-in) -----------------------------
  // Both the giver (per claim/contribution) AND the giftee (per list) must opt
  // in before the recipient sees anything. Bob has a claim AND a contribution on
  // i1; Carol has an un-revealed claim on i2.
  console.log("\nPost-occasion reveal:");
  await bob.client.from("claims").update({ revealed: true }).eq("item_id", i1).eq("buyer_id", bob.id);
  const revGiverOnly = await alice.client.from("claims").select("*").eq("item_id", i1);
  check(
    "Giver revealed but giftee hasn't opted in → recipient sees nothing",
    (revGiverOnly.data?.length ?? 0) === 0,
  );
  await alice.client.from("wishlists").update({ reveal_requested: true }).eq("id", list.id);
  const revBoth = await alice.client.from("claims").select("*").eq("item_id", i1);
  check(
    "BOTH opted in → recipient finally sees the revealed claim",
    (revBoth.data?.length ?? 0) === 1 && revBoth.data?.[0]?.buyer_id === bob.id,
  );
  const revGifteeOnly = await alice.client.from("claims").select("*").eq("item_id", i2);
  check(
    "Giftee opted in but that giver didn't reveal → that claim stays hidden",
    (revGifteeOnly.data?.length ?? 0) === 0,
  );
  const revContribHidden = await alice.client.from("contributions").select("*").eq("item_id", i1);
  check(
    "Contribution reveal is independent — still hidden until its giver reveals",
    (revContribHidden.data?.length ?? 0) === 0,
  );
  await bob.client
    .from("contributions")
    .update({ revealed: true })
    .eq("item_id", i1)
    .eq("contributor_id", bob.id);
  const revContribShown = await alice.client.from("contributions").select("*").eq("item_id", i1);
  check(
    "BOTH opted in → recipient sees the revealed contribution",
    (revContribShown.data?.length ?? 0) === 1,
  );
  const revOutsider = await mallory.client.from("claims").select("*").eq("item_id", i1);
  check("Outsider still sees nothing after a reveal", (revOutsider.data?.length ?? 0) === 0);
  const malloryFlip = await mallory.client
    .from("wishlists")
    .update({ reveal_requested: true })
    .eq("id", list.id)
    .select();
  check("Non-owner CANNOT request reveal on someone's list", (malloryFlip.data?.length ?? 0) === 0);
  await alice.client.from("wishlists").update({ reveal_requested: false }).eq("id", list.id);
  const revWithdrawn = await alice.client.from("claims").select("*").eq("item_id", i1);
  check("Recipient withdrawing opt-in restores the Surprise Wall", (revWithdrawn.data?.length ?? 0) === 0);

  // --- Secret Santa (server-side, secret draw) -----------------------------
  console.log("\nSecret Santa:");
  const carolDraw = await carol.client.rpc("draw_secret_santa", { p_group_id: group.id });
  check("Non-admin CANNOT draw names", !!carolDraw.error, "expected error");
  const aliceDraw = await alice.client.rpc("draw_secret_santa", { p_group_id: group.id });
  check("Admin can draw names", !aliceDraw.error, aliceDraw.error?.message);
  const bobAssign = await bob.client.from("santa_assignments").select("*").eq("group_id", group.id);
  check("Member sees ONLY their own assignment", (bobAssign.data?.length ?? 0) === 1);
  check(
    "Your assignment is yours and is never yourself",
    bobAssign.data?.[0]?.giver_id === bob.id && bobAssign.data?.[0]?.receiver_id !== bob.id,
  );
  const malloryAssign = await mallory.client
    .from("santa_assignments")
    .select("*")
    .eq("group_id", group.id);
  check("Outsider sees no assignments", (malloryAssign.data?.length ?? 0) === 0);
  const drawnCheck = await bob.client.rpc("santa_is_drawn", { p_group_id: group.id });
  check("santa_is_drawn() is true after the draw", drawnCheck.data === true);

  // Exclusions: admin-managed pairs who must never draw each other.
  const bobExcl = await bob.client
    .from("santa_exclusions")
    .insert({ group_id: group.id, user_a: bob.id, user_b: carol.id });
  check("Non-admin CANNOT add a Santa exclusion", !!bobExcl.error, "expected RLS error");
  const aliceExcl = await alice.client
    .from("santa_exclusions")
    .insert({ group_id: group.id, user_a: alice.id, user_b: bob.id });
  check("Admin can add a Santa exclusion", !aliceExcl.error, aliceExcl.error?.message);
  const bobReadExcl = await bob.client.from("santa_exclusions").select("*").eq("group_id", group.id);
  check("Non-admin CANNOT read exclusions", (bobReadExcl.data?.length ?? 0) === 0);
  const aliceReadExcl = await alice.client
    .from("santa_exclusions")
    .select("*")
    .eq("group_id", group.id);
  check("Admin can read exclusions", (aliceReadExcl.data?.length ?? 0) === 1);
  // The re-draw must honor the exclusion in BOTH directions.
  const reDraw = await alice.client.rpc("draw_secret_santa", { p_group_id: group.id });
  check("Admin can re-draw with an exclusion in place", !reDraw.error, reDraw.error?.message);
  const aliceA = await alice.client
    .from("santa_assignments")
    .select("receiver_id")
    .eq("group_id", group.id)
    .eq("giver_id", alice.id)
    .maybeSingle();
  const bobA = await bob.client
    .from("santa_assignments")
    .select("receiver_id")
    .eq("group_id", group.id)
    .eq("giver_id", bob.id)
    .maybeSingle();
  check(
    "Draw honors the exclusion (Alice and Bob never draw each other)",
    aliceA.data?.receiver_id !== bob.id && bobA.data?.receiver_id !== alice.id,
  );

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

  console.log("\nNotification preferences:");
  const aliceSetPref = await alice.client
    .from("notification_preferences")
    .upsert({ user_id: alice.id, new_item: false });
  check("User can set own notification prefs", !aliceSetPref.error, aliceSetPref.error?.message);
  const bobForgePref = await bob.client
    .from("notification_preferences")
    .insert({ user_id: alice.id, new_item: false });
  check("Cannot write notification prefs for another user", !!bobForgePref.error, "expected RLS error");
  const bobReadsAlicePref = await bob.client
    .from("notification_preferences")
    .select("*")
    .eq("user_id", alice.id);
  check("Cannot read another user's notification prefs", (bobReadsAlicePref.data?.length ?? 0) === 0);

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
