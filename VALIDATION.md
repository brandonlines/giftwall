# Backend validation — one pass

Goal: prove the backend actually works (especially the **Surprise Wall** RLS)
against a real Supabase project, in one sitting. The app code only proves it
*compiles*; this proves the database *behaves*.

Use a **throwaway / staging** Supabase project for this — the test creates and
deletes users and needs the service_role key.

## 1. Create the project
- New project at supabase.com (free tier is fine).
- Settings → API: copy **Project URL**, **anon key**, **service_role key**.

## 2. Apply the schema
Run the migrations **in order** (they depend on each other — e.g. the RLS
helpers in `0001`/`0005` are reused by later policies):

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```
…or paste `supabase/migrations/0001 … 0015` into the SQL editor in numeric order.

Migrations:
- `0001` schema + Surprise Wall RLS · `0002` push tokens · `0003` invites
- `0004` avatar storage · `0005` admin member RLS · `0006` quantity
- `0007` most-wanted · `0008` activity feed · `0009` item comments
- `0010` account-deletion FK · `0011` admin group delete · `0012` multi-qty claims
- `0013` realtime comments/activity · `0014` item images · `0015` harden group join

## 3. Run the automated RLS test  ← the important step
```bash
cp .env.test.example .env.test     # fill in URL + anon + service_role
npm install                        # if you haven't
npm run test:rls
```
Expect: **all assertions pass ✅** and the script cleans up its test users.
It creates Alice/Bob/Carol/Mallory and asserts, through the real PostgREST +
RLS stack:
- the recipient can't see claims, comments, or who's buying on their own list;
- members (not the recipient) can; outsiders see nothing;
- you can't claim your own item or double-claim; invite codes scope joins;
- admins can manage members, non-admins can't; profiles/activity scope correctly.

If anything fails it exits non-zero and lists the failures. **Re-run this after
any change to a `*.sql` policy.**

## 4. Edge Functions (not covered by the test — do once)
```bash
npx supabase functions deploy scrape-link
npx supabase functions deploy send-push
npx supabase secrets set WEBHOOK_SECRET=<random>
```
- Database → Webhooks: on `items` INSERT call `send-push` with header
  `x-webhook-secret: <same value>`.
- Smoke test `scrape-link`: invoke with a real product URL and a blocked one
  (e.g. `http://169.254.169.254/`) — the second must be refused (SSRF guard).

## 5. Auth providers (for device testing)
- Authentication → Providers: enable **Apple** and **Google**.
- URL Configuration → Redirect URLs: add `giftwall://auth-callback`.

## 6. Manual device smoke test (what the script can't do)
Put the same URL + anon key in the app `.env`, then `npx expo start`:
- [ ] Sign in as two accounts (email OTP works in Expo Go).
- [ ] Account A creates a group, shares the invite link; B joins.
- [ ] A creates a wishlist + items; **A sees no claim UI on its own list**.
- [ ] B claims an item → B sees "you're buying", and on A's device nothing
      changes (the Surprise Wall, live).
- [ ] B marks purchased; B and C discuss via 💬; A can't see the discussion.
- [ ] Add an item → other members get a push (needs a dev build + EAS id).

## What this validates vs. doesn't
- ✅ Schema applies, RLS/Surprise Wall holds, triggers populate activity,
  invites/admin/comments policies are correct.
- ⛔ Not auto-tested: realtime delivery, push payloads, OAuth provider setup,
  native sign-in — these need the manual device pass in step 6.
