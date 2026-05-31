# giftwall — gap analysis & roadmap

_Snapshot: 2026-05-30. The app is feature-rich (60+ features), backend is live,
the Surprise Wall is proven (RLS test 34/34), Apple sign-in works, and it's on
TestFlight. This is an honest list of what's still missing, ranked by impact._

## 1. Launch blockers — fix before the family beta

| Gap | Why it matters | Effort |
|---|---|---|
| **Google + email sign-in broken** | Family who don't use Apple literally can't get in. Google = "localhost" redirect (Supabase Redirect URLs); email = no code (Magic Link/Confirm-signup templates need `{{ .Token }}`). | Small (dashboard) |
| **Push notifications not fully wired** | The `items`→`send-push` webhook + `WEBHOOK_SECRET`. Deployed but not triggered. | Small (dashboard) |
| **New features untested on live DB** | Group gifting (0017) + reactions (0018) are built/green but never run against the live DB or a device. Need `db push` + `test:rls` + a real two-account try. | Small–medium |
| **Real support email** ✅ | Done — `support@gift-well.ca` across the policy, in-app legal, and account screens. | — |

## 2. Top missing features (ranked by demand)

1. **Secret Santa / gift exchange (draw names).** The #1 reason families use apps like this at the holidays. Assign who buys for whom, kept secret (RLS so you only see your own assignment + optional exclusions). High demand, medium-high effort.
2. **Post-occasion reveal + thank-you.** After the event date passes, let the recipient finally see who gave/claimed what and send thanks — closes the gifting loop. Needs a careful RLS change (allow the owner to see claims once `event_date` < today). Security-sensitive; do it deliberately.
3. **Shipping address per person.** "Where do I send it?" for distributed families. A profile field + group-visible, owner-editable.
4. **Recurring occasions.** Birthdays repeat yearly; today `event_date` is one-off. Auto-roll to next year.
5. **Notification preferences.** Per-type toggles (new item, comment, occasion reminder) once push is live.
6. **Occasion reminders (scheduled push).** `event_date` exists but nothing fires "3 days until Mom's birthday" — needs a scheduled/cron Edge Function.

## 3. Consistency & robustness gaps

- **Claims vs. group-gift contributions overlap.** An item can be individually *claimed* AND *chipped-in* at the same time — confusing. Product decision needed: a per-item mode ("solo gift" vs "group gift") so the UI shows one path, not both.
- **Realtime is claims-only.** `contributions` and `reactions` are in the realtime publication but the list screen only subscribes to claim changes — so reactions/chip-ins don't live-update across devices (a refresh shows them). Wire `subscribeToReactions` / `subscribeToContributions`.
- **Offline queue is partial.** Covers claims/comments/items, not contributions/reactions (those just error offline instead of queuing).
- **Currency handling is thin.** `formatPrice` is `$`-first + a raw code; no real multi-currency formatting/locale.

## 4. Operational / store checklist (not features)

- [ ] Host `docs/privacy.html` → real Privacy Policy URL (see `docs/README.md`).
- [ ] App Store **screenshots** (plan in `STORE.md`).
- [ ] Real **app icon** ✅ done · **Sentry DSN** (crash reporting is dormant until set).
- [ ] Broad **device testing** — only Apple sign-in + the RLS suite have run for real.
- [ ] Google/email auth + push webhook (also in §1).
- [ ] Apple **external TestFlight** beta review (first build) before non-team testers.

## 5. Nice-to-haves / later

Global search across groups · wishlist item reordering · multiple photos per item ·
"reserve for later" soft-interest vs hard claim · richer profiles · web-app polish ·
group themes/cover photos · gift-idea suggestions by occasion/budget.

---

**Honest take:** the core (the Surprise Wall, shared lists, claims, group gifting)
is strong and proven. The biggest *real* gaps before a confident launch are the
**two sign-in fixes** and **push wiring** (both small, dashboard-only), then
**live-testing the new features**. The biggest *growth* feature is **Secret Santa**.
