# Security model

giftwall's defining promise — the **Surprise Wall** — is a security property, not a
UI nicety: a gift recipient must never be able to learn who claimed, bought, or
chipped in on their own list. That guarantee is enforced in Postgres with
Row-Level Security, so it holds no matter what a client (or a tampered client)
does. This document is the map of that enforcement and the rest of the backend
posture. It's audited end-to-end by `npm run test:rls`, which exercises the
running stack with real auth users.

## Principles

1. **The database is the trust boundary.** The app is a convenience; every
   access rule is re-checked by RLS or a `SECURITY DEFINER` function. A
   malicious client with a valid JWT can do no more than the policies allow.
2. **The recipient is the adversary for claim data.** Policies are written so
   the list owner is *excluded* from seeing claims/contributions on their items.
3. **Least privilege.** Anonymous users can do almost nothing; authenticated
   users can only touch rows in groups they belong to; the `service_role` key
   lives only in Edge Functions and `.env.test`, never in the app bundle.

## The Surprise Wall predicate

`can_see_claims_for_item(item_id)` is the single source of truth for "may the
current user see who's acting on this item?" It returns true for group members
*who are not the list owner*, false for the owner. Every table that exposes
claim-like data reuses it, so the wall can't drift between features:

| Table           | Read policy gates on                            |
| --------------- | ----------------------------------------------- |
| `claims`        | `can_see_claims_for_item(item_id)`              |
| `contributions` | `can_see_claims_for_item(item_id)` (group gift) |
| `item_comments` | `can_see_claims_for_item(item_id)`              |

`reactions` deliberately does **not** use it — a ❤️ is not a spoiler, so
reactions are group-visible (recipient included) and gated only on group
membership.

`activity` is Surprise-Wall-safe by construction: the feed logs
`member_joined`, `list_created`, and `item_added` only — never claims or
purchases — so a recipient can't infer a buyer from the timeline.

## Coverage checklist (audited 2026-05)

- **RLS enabled on all 12 tables** — `activity, claims, contributions, groups,
  item_comments, items, memberships, profiles, push_tokens, reactions,
  santa_assignments, wishlists`. No table relies on the absence of a policy.
- **No blanket policies.** No `using (true)` / `with check (true)` anywhere.
- **`search_path` locked on every `SECURITY DEFINER` function** (`set
  search_path = public`) — closes the classic privilege-escalation vector where
  a caller's search_path redirects an unqualified reference to a malicious
  object.
- **RPCs are authenticated-only** (migration `0021`). `EXECUTE` is revoked from
  `PUBLIC` and re-granted to `authenticated`/`service_role` on `create_group`,
  `redeem_invite`, `rotate_invite_code`, `draw_secret_santa`, `santa_is_drawn`.
  RLS helper functions keep their `PUBLIC` grant so policy evaluation works for
  anonymous reads.
- **Per-user storage.** `avatars` and `item-images` are public-read buckets, but
  writes/updates/deletes are constrained to a folder named after the caller's
  uid: `(storage.foldername(name))[1] = auth.uid()::text`.
- **Push tokens are private.** A user can only see/manage their own device
  tokens; the send-push Edge Function reads others' tokens with the service role
  to fan out, bypassing RLS deliberately and only server-side.
- **Profiles leak nothing cross-group.** Readable only for yourself and users
  with whom you share at least one group (a `memberships ⋈ memberships` join),
  not the whole table.
- **Every write path self-binds the actor.** INSERT policies on `claims`,
  `contributions`, `item_comments`, and `reactions` all require the row's actor
  id to equal `auth.uid()` — you can't forge a row as someone else — and (for the
  claim-like tables) require `can_see_claims_for_item`, so a recipient can't even
  write a probe row against their own item. Membership can be gained only through
  the `create_group` / `redeem_invite` RPCs or an admin add; the open self-join
  policy was removed in `0015`. Every UPDATE policy pairs `USING` with an equal
  `WITH CHECK` — the one exception, `groups`, was fixed in `0022`.

## Secret Santa secrecy

`santa_assignments` has a single SELECT policy: `giver_id = auth.uid()`. A member
sees only *their own* assignment — never the full map, never who's buying for
them. `draw_secret_santa(group_id)` is admin-only, runs `SECURITY DEFINER`, and
computes a single random-cycle derangement (no one draws themselves) **without
returning the mapping** — so even the admin who triggers the draw learns
nothing. The RLS suite asserts: non-admins can't draw, a member sees exactly one
assignment that is never themselves, and outsiders see none.

## Invite codes

8 characters from a 32-symbol unambiguous alphabet (no `0/O/1/I`) → ~2^40 space,
unique-indexed, generated server-side and never exposed to non-members.
`redeem_invite` normalizes input (`upper(trim(...))`) and is idempotent. A
non-member cannot read a group row (hence can't read its code); they can only
join by presenting a code. Admins can `rotate_invite_code` to revoke a leaked
one.

## Edge Functions

- **scrape-link** fetches user-supplied URLs, so SSRF is the real risk. Guards:
  http(s) only; DNS resolved and every A/AAAA record checked against private /
  link-local / CGNAT ranges (incl. `169.254.169.254` cloud metadata); redirects
  followed manually so every hop is re-validated; response capped at 1 MB with
  an 8 s timeout.
- **send-push** runs with `verify_jwt = false` (it's a DB webhook), so
  `WEBHOOK_SECRET` is its *only* auth gate. It fails **closed** — refusing to run
  if the secret is unset rather than accepting anonymous triggers — and compares
  the `x-webhook-secret` header in constant time. (Its push title/body come from
  the request payload, so an open endpoint would be a push-phishing vector.) It
  then reads tokens with the service role to fan out to group members.
- **delete-account** uses the caller's JWT to identify the user, then the service
  role to erase their data (account deletion / GDPR-style export path).

## Secret handling

- The publishable/anon key is public by design (RLS is what protects data).
- The `service_role` key (Supabase's secret, RLS-bypassing key) must **never**
  be committed or pasted anywhere outside Edge Function secrets and a gitignored
  `.env.test`. `.env*` is gitignored; commits are checked for staged secrets.

## Re-running the audit

```sh
npm run test:rls   # real users exercise every policy incl. the Surprise Wall
```

Any change to a policy, a `SECURITY DEFINER` function, or a new table that holds
claim-like data must be accompanied by a matching assertion here.
