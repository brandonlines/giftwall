# giftwall — gap analysis & roadmap

_Snapshot: 2026-05-31. The app is feature-rich, the backend is live and hardened,
the Surprise Wall is proven (RLS suite), Apple + Google sign-in work, and it's on
TestFlight. This is an honest list of what's still missing, ranked by impact._

## ✅ Shipped recently

- **Secret Santa + event types** — secret server-side derangement, per-group
  event type, and **exclusions** (couples never drawn together).
- **Recurring yearly occasions** — birthdays roll forward instead of "300 days
  ago".
- **Shipping address** — optional, co-member-visible, owner-editable profile
  field (reuses profiles RLS).
- **Notification preferences** — per-type push toggles; send-push honors
  `new_item`, the occasion-reminders job honors `occasion_reminder`.
- **Occasion reminders** — `occasion-reminders` Edge Function pushes 7/3/1/0-day
  nudges to givers (needs a daily schedule — see operator to-do).
- **Group gifting clarity** — `is_group_gift` flag: one path per item.
- **Realtime everywhere** + **offline queue everywhere** — reactions and
  contributions now live-update AND queue offline (was claims/comments/items
  only).
- **Currency-aware prices** — symbols (£/€/¥/…) + thousands separators.
- **Purchased view** in Shopping; **better price scraping** (JSON-LD/microdata).
- **Backend security pass** — RPCs locked to authenticated (0021), groups UPDATE
  WITH CHECK (0022), send-push fails closed + prunes dead push tokens, full
  write-path RLS audit, independent review. See `SECURITY.md`.

## ⚠️ Operator to-do (not code)

- **Apply migrations + redeploy** so the above goes live:
  `npx supabase db push` (0017–0026); `npx supabase functions deploy scrape-link
  send-push delete-account occasion-reminders`; then `npx eas update --branch
  production`. Re-run `npm run test:rls` after the push.
- **Set `WEBHOOK_SECRET`** (function secret + the webhook's `x-webhook-secret`
  header) — send-push and occasion-reminders both refuse to run without it.
- **Schedule `occasion-reminders`** once a day (Supabase Scheduled Functions, or
  pg_cron + pg_net — example in the function header).
- **Email sign-in** — confirm the Magic Link / signup templates include
  `{{ .Token }}` so OTP codes arrive (Google + Apple already work).

## Top missing feature

1. **Post-occasion reveal + thank-you.** After the event passes, let the
   recipient finally see who gave what and say thanks. **Security-sensitive and
   deferred on purpose:** a naive "event_date < today → reveal" is exploitable —
   the owner controls `event_date` and could back-date it to peek early. Needs an
   immutable, system-set reveal time (not owner-editable to the past) before it's
   safe to touch the Surprise Wall predicate.

## Operational / store checklist

- [ ] Host `docs/privacy.html` → real Privacy Policy URL (see `docs/README.md`).
- [ ] App Store **screenshots** (plan in `STORE.md`).
- [x] Real **app icon** · [ ] **Sentry DSN** (crash reporting dormant until set).
- [ ] Broad **device testing** beyond the RLS suite + Apple/Google sign-in.
- [ ] Apple **external TestFlight** review before non-team testers.

## Nice-to-haves / later

Global search across groups · wishlist item reordering · multiple photos per item ·
"reserve for later" soft-interest vs hard claim · richer profiles · web-app polish ·
group themes/cover photos · per-occasion (not global) shipping addresses.

---

**Honest take:** the core (Surprise Wall, shared lists, claims, group gifting,
Secret Santa) is strong and proven, and the backend is hardened, documented, and
independently reviewed. The remaining work before a confident public launch is
mostly operator/dashboard (apply migrations, set the webhook secret, schedule the
reminder job, email templates) plus the **post-occasion reveal** — the one
feature that must be designed carefully because it deliberately relaxes the
Surprise Wall.
