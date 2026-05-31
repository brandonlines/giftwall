# giftwall — gap analysis & roadmap

_Snapshot: 2026-05-31. The app is feature-rich, the backend is live, the Surprise
Wall is proven (RLS suite), Apple + Google sign-in work, and it's on TestFlight.
This is an honest list of what's still missing, ranked by impact._

## ✅ Shipped since the 2026-05-30 snapshot

- **Secret Santa + event types** — draw names (secret, server-side derangement),
  per-group event type, and **exclusions** (couples never drawn together).
- **Recurring yearly occasions** — birthdays roll forward instead of reading
  "300 days ago".
- **Group gifting clarity** — `is_group_gift` flag: each item shows ONE path
  (solo claim _or_ chip-in), not both.
- **Realtime everywhere** — reactions, contributions, and Secret Santa now
  live-update (no longer claims-only).
- **Purchased view** in Shopping (filter To-buy/Purchased, sort by group/name).
- **Better price scraping** — JSON-LD + microdata, not just OpenGraph.
- **Backend security pass** — RPCs locked to authenticated callers (0021),
  groups UPDATE given a WITH CHECK (0022), send-push fails closed on a missing
  webhook secret, full write-path RLS audit. See `SECURITY.md`.

## ⚠️ Operator to-do (not code)

- **Apply pending migrations + redeploy** to the live DB so the above goes out:
  `npx supabase db push` (0017–0024), `npx supabase functions deploy scrape-link`
  and `send-push`, then `npx eas update --branch production`. Re-run
  `npm run test:rls` after the push.
- **Set `WEBHOOK_SECRET`** (function secret + the webhook's `x-webhook-secret`
  header) — send-push now refuses to run without it.
- **Email sign-in** — confirm the Magic Link / signup templates include
  `{{ .Token }}` so OTP codes arrive (Google + Apple already work).

## Top missing features (ranked by demand)

1. **Post-occasion reveal + thank-you.** After the event passes, let the
   recipient finally see who gave what and say thanks. **Security-sensitive and
   deferred on purpose:** a naive "event_date < today → reveal" is exploitable —
   the owner controls `event_date` and could back-date it to peek early. Needs an
   immutable, system-set reveal time (not owner-editable to the past) before it's
   safe to touch the Surprise Wall predicate.
2. **Shipping address per person.** "Where do I send it?" for distributed
   families — a profile field, visible to co-members, owner-editable. (PII, so
   scope it exactly like profiles: co-members only.)
3. **Notification preferences.** Per-type toggles (new item, comment, occasion
   reminder). Best done once push is fully live.
4. **Occasion reminders (scheduled push).** `event_date`/recurrence exist, but
   nothing fires "3 days until Mom's birthday" — needs a scheduled/cron Edge
   Function reusing the send-push fan-out.

## Consistency & robustness gaps

- **Offline queue is partial.** Covers claims/comments/items, not
  contributions/reactions (those error offline instead of queuing).
- **Currency handling is thin.** `formatPrice` is `$`-first + a raw code; no real
  multi-currency/locale formatting.

## Operational / store checklist

- [ ] Host `docs/privacy.html` → real Privacy Policy URL (see `docs/README.md`).
- [ ] App Store **screenshots** (plan in `STORE.md`).
- [x] Real **app icon** · [ ] **Sentry DSN** (crash reporting dormant until set).
- [ ] Broad **device testing** beyond the RLS suite + Apple/Google sign-in.
- [ ] Apple **external TestFlight** review before non-team testers.

## Nice-to-haves / later

Global search across groups · wishlist item reordering · multiple photos per item ·
"reserve for later" soft-interest vs hard claim · richer profiles · web-app polish ·
group themes/cover photos.

---

**Honest take:** the core (Surprise Wall, shared lists, claims, group gifting,
Secret Santa) is strong and proven, and the backend is now hardened and
documented. The remaining work before a confident public launch is mostly
operator/dashboard (apply migrations, set the webhook secret, email templates)
plus the **post-occasion reveal** — the one feature that must be designed
carefully because it deliberately relaxes the Surprise Wall.
