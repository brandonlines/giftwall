# giftwall

A group gift-wishlist app with a **Surprise Wall**: list owners (gift recipients)
can never see who claimed or bought items on their own list, while everyone else
in the group can. The privacy guarantee is enforced in Postgres with Row-Level
Security, not in the client — so no UI bug or network inspection can leak a
surprise.

Built for a closed family/friends launch first, then the iOS + Android stores.

## Stack

- **Client:** React Native via **Expo** (SDK 56), TypeScript, expo-router.
- **Backend:** **Supabase** — Postgres + RLS, Auth, Realtime, Edge Functions.
- **Offline:** local mutation queue (stub) that replays claims when back online.

Why these: the Surprise Wall is relational "who-can-see-what" logic, which
Postgres RLS expresses airtightly; Expo gives the fastest path to both app
stores with OTA updates and shares TypeScript with the rest of the codebase.

## Layout

```
src/
  lib/
    env.ts            # reads EXPO_PUBLIC_* config, fails loud if missing
    supabase.ts       # typed client, AsyncStorage session, app-state refresh
    auth.ts           # email magic-link / OTP sign-in helpers
  types/
    database.ts       # typed schema (regenerate with `supabase gen types`)
  data/
    repositories/     # ONLY layer that talks to Supabase
      groups.ts
      wishlists.ts
      claims.ts        # claim/release with offline fallback
    offline/queue.ts  # AsyncStorage-backed mutation queue + flush()
    realtime.ts       # postgres_changes subscription (RLS-enforced)
  hooks/
    use-auth.ts       # session source of truth; flushes offline queue on login
  app/                # expo-router screens (currently the starter template)
supabase/
  migrations/
    0001_init.sql     # schema + Surprise Wall RLS  <-- the important file
```

The UI depends on `data/repositories/*`, never on the Supabase SDK directly.
That seam is where a fuller offline/cache layer (PowerSync, WatermelonDB, or
TanStack Query persistence) drops in later without touching screens.

## See the design now (no backend)

To eyeball the themes and glassmorphism without any setup:

```bash
npm install
npm run web        # opens http://localhost:8081
```

Then open **http://localhost:8081/preview** — a backend-free gallery that shows
every palette (with a live switcher), the glass cards, claim-button states, and
buttons. This is the quickest way for anyone to see the look on their machine.

> Web is configured as a single-page app (`web.output: "single"` in app.json)
> because the app is client-only — Supabase auth needs browser storage, so the
> static/SSR prerender mode doesn't apply.

## Web app on GitHub Pages

The same codebase ships as a public web app at
**https://brandonlines.github.io/giftwall** (and from `gift-well.ca`, which
redirects there). `.github/workflows/deploy-web.yml` runs `expo export
--platform web` and publishes `dist/` on every push to `main`. Email and Google
sign-in work in the browser; **Sign in with Apple is native-iOS only** and is
hidden on web. Native-only features (barcode scan, push, share-to-app) degrade
gracefully. Full setup — Pages, Supabase redirect URLs, Google OAuth origins,
and the `gift-well.ca` redirect — is in [docs/WEB-DEPLOY.md](docs/WEB-DEPLOY.md).

## Run the full app on a phone

1. Set up Supabase (below) and put real values in `.env`.
2. `npx expo start`, then scan the QR with **Expo Go**. Email OTP, groups,
   wishlists, claims, theming, and join links all work in Expo Go.
3. **Sign in with Apple / Google and push notifications need a dev build**
   (native modules Expo Go doesn't include): `npx expo run:ios` /
   `npx expo run:android`, or an EAS build.

## Tests & CI

```bash
npm test          # Jest unit suite (runs offline, no backend)
npm run test:rls  # the RLS / Surprise Wall suite (needs a Supabase project)
```

`npm test` covers the pure logic that must not regress: price/time formatting,
the claim-state derivation (multi-quantity + Surprise Wall), the offline queue,
the `t()` i18n helper, and a **WCAG contrast checker** that fails if any palette's
text/background pair drops below the accessible floor. `.github/workflows/ci.yml`
runs typecheck + lint + `npm test` on every push, and the RLS suite automatically
once Supabase secrets are added to the repo.

## Validate the backend (do this before trusting it)

The app compiling does NOT prove the database behaves. Point a throwaway
Supabase project at it and run the automated RLS suite:

```bash
cp .env.test.example .env.test   # URL + anon + service_role key
npm run test:rls
```

It creates four real users and asserts the **Surprise Wall** and every policy
through the live PostgREST + RLS stack (recipient can't see claims/comments,
members can, outsiders can't, claim/admin guards, etc.). Full step-by-step in
[VALIDATION.md](VALIDATION.md). Re-run after any change to a `*.sql` policy.

## Run the backend locally (fastest, needs Docker)

With Docker running, `supabase/config.toml` brings up the whole backend —
Postgres, Auth, Realtime, Studio, and Edge Functions — and applies all
migrations:

```bash
npx supabase start          # prints local URL + anon key -> put in .env
npx supabase functions serve  # scrape-link + send-push locally
```

Email OTP codes land in the local Inbucket mailbox at http://localhost:54324.

## Setup (hosted project)

1. **Create a Supabase project** at supabase.com.
2. **Apply the schema.** Either paste each file in `supabase/migrations/` into
   the SQL Editor in order, or use the CLI:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. **Configure env:**
   ```bash
   cp .env.example .env   # fill in URL + anon key from Project Settings > API
   ```
4. **Enable Realtime** for `items` and `claims` (the migration already adds them
   to the `supabase_realtime` publication). RLS is enforced on these feeds, so
   recipients never receive claim events for their own list.
5. **Regenerate types** (optional but recommended once the project exists):
   ```bash
   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
   ```
6. **Auth providers** (Supabase Dashboard > Authentication > Providers):
   - Enable **Apple** and **Google**.
   - Under URL Configuration > Redirect URLs, add the deep link the app uses
     for OAuth: `giftwall://auth-callback`.
7. **Deploy Edge Functions:**
   ```bash
   npx supabase functions deploy scrape-link
   npx supabase functions deploy send-push
   npx supabase functions deploy delete-account
   npx supabase secrets set WEBHOOK_SECRET=<random-value>
   ```
8. **Wire the push webhook** (Dashboard > Database > Webhooks): on `items`
   INSERT, call the `send-push` Edge Function and add header
   `x-webhook-secret: <same value as above>`.
9. **Push notifications** need an EAS project id (`eas init`) and a real device
   (simulators can't get a push token).

## Run

```bash
npm install
npm run ios       # or: npm run android   (needs Xcode / Android Studio)
npm run start     # then scan the QR with Expo Go for quick device testing
```

## The Surprise Wall (how it actually holds)

All privacy lives in `supabase/migrations/0001_init.sql`. The key rule on the
`claims` table:

- A claim is **visible** to group members who are **not** the list owner, or to
  the buyer themselves.
- A user can **insert** a claim only for an item they're allowed to buy for
  (in the group, not the recipient), and the claim is always recorded as theirs.
- Only the buyer can update/release their own claim.

This is encapsulated in `public.can_see_claims_for_item(item_id)`, used by both
the SELECT and INSERT policies so the read rule and write rule can never drift.

**Do not** move claim data onto Supabase Realtime *Broadcast* — that channel
does not apply RLS and would defeat the wall. Use `postgres_changes` only.

## What's built

- **Home dashboard** — the groups screen surfaces the soonest occasions across
  every group with an "unclaimed" nudge for others' lists (never your own — the
  Surprise Wall), plus a search entry. `src/data/repositories/dashboard.ts`.
- **Global search** — gifts + people across all your groups, RLS-scoped.
  `src/app/search.tsx`, `src/data/repositories/search.ts`.
- **Reserve for later** — a soft-interest toggle that sits below a hard claim and
  never blocks one; same Surprise Wall as claims (`reservations` table reuses
  `can_see_claims_for_item`). `src/data/repositories/reservations.ts`,
  `src/lib/reserve-state.ts`.
- **Multiple photos per item** — a `photos[]` gallery alongside the `image_url`
  cover; manage both in the item form, view the gallery on the list (migration
  `0031`).
- **Auth** — email OTP, Sign in with Apple (native), Google (OAuth/PKCE).
  `src/app/sign-in.tsx`, `src/lib/auth.ts`, `src/providers/auth.tsx`.
- **Screens** — groups home, group detail (wishlists + invite-code banner with
  share/rotate + view members), wishlist detail with live claim buttons,
  add-item-by-link, owner inline edit/delete of items, a members screen with
  leave-group, and a profile screen with display name + avatar. `src/app/`.
- **Onboarding** — a first-run 3-card intro (`src/app/onboarding.tsx`)
  explaining the Surprise Wall; a `seen` flag in AsyncStorage shows it once, and
  the `_layout` gate routes first-run users to it before sign-in.
- **Privacy Policy + Terms** — canonical copy in `src/legal/content.ts`,
  rendered in-app at `legal/[doc]` (linked from Profile) and mirrored in
  `PRIVACY.md` / `TERMS.md` for public hosting (the stores need a public URL).
  PRIVACY.md also includes a data-safety summary for the submission forms.
- **Barcode scan** _(native)_ — a `/scan` route (`expo-camera`) lets an owner
  scan a product barcode to start an add-item; on web it shows a "use the app"
  message so the build stays green. Reachable from the add box. Real scanning
  needs a device dev build.
- **Add from anywhere** _(native)_ — share a product link into giftwall from
  any app's share sheet and it drops into the next item you add. The in-app
  handoff is built and tested today: a shared URL is stashed in
  `src/lib/share-intent.ts` (`pendingSharedUrl`, AsyncStorage), the groups
  screen nudges "Shared link ready — open a list to add it", and the add form
  (`ItemForm`) prefills + clears it on open. The OS-level *capture* (registering
  giftwall as a share target) is wired on a dev build with `expo-share-intent` —
  see **Share extension** below. Confirming the share target needs a device.
- **Price re-check** — an owner can "Refresh price" on an item with a link; it
  re-scrapes and, if the price changed, updates it and flags a "↓ price changed"
  badge. (Live re-scraping needs the `scrape-link` Edge Function deployed.)
- **Occasions / countdowns** — a wishlist can have an optional event date
  (migration `0016`); the list shows a "in 12 days / Today! / Passed" countdown
  (unit-tested `src/lib/dates.ts`) in a banner and on the group's list rows.
  Owners set/clear it on the list; timed push *reminders* are a follow-up
  (needs a scheduled Edge Function).
- **My shopping list** — a buyer-side `/shopping` screen (🛍️ in the groups
  header) aggregating everything *you've* claimed across **all** groups, grouped
  by recipient list, with a tap-to-check-off "bought" state and a "N left to buy"
  count. Shows only your own claims, so the Surprise Wall is unaffected.
- **Account controls** — in-app **data export** (own profile/lists/items/claims/
  comments to a JSON file via the share sheet) and **account deletion** (the
  `delete-account` Edge Function deletes the caller via service role; migration
  `0010` makes `groups.created_by` ON DELETE SET NULL so it cascades cleanly).
  Required by the app stores. In Profile → "Your data".
- **Avatars** — public `avatars` Storage bucket with per-user-folder RLS
  (migration `0004`); upload via image picker in `src/data/repositories/profile.ts`.
- **UX polish** — a themed **Toast** (`ToastProvider`/`useToast`) replaces raw
  Alerts for non-critical errors (loads, claims) while destructive actions keep
  confirm dialogs; **Skeleton**/`SkeletonCard` shimmer placeholders on first
  load; friendly **EmptyState** screens; and cursor-based **pagination**
  (Load more / infinite scroll) on the activity feed.
- **Responsive & motion** — `Screen` constrains content to a centered ~560px
  column so it reads well on iPad / landscape / wide web instead of stretching;
  Dynamic Type is honored (no disabled font scaling); a `useReducedMotion` hook
  stills the Skeleton shimmer and Toast fade when the OS "Reduce Motion" is on.
- **Accessibility & i18n** — theme tokens audited for WCAG AA contrast (fixed
  several low-contrast "claimed" chips, incl. white-on-pink in Northern Lights);
  `accessibilityRole`/`accessibilityLabel` on the shared Button, pressable Card,
  and the claim/purchase/discuss/edit controls. Lightweight i18n in `src/i18n/`
  (string catalog + `t()` with `{var}` interpolation), wired through the sign-in
  and groups screens. **English + Spanish**, with `expo-localization` picking the
  device language (en fallback); the `es` catalog is typed to match `en`'s keys
  and a unit test re-checks parity.
- **Theming** — 5 selectable palettes (Winter Frost, Cabin Cozy, Fireside Cozy,
  Northern Lights, Mountain Chalet) in `src/theme/`. Semantic tokens (no raw hex
  in screens), persisted choice, gradient-aware `Screen` + glass `Card`
  (real `expo-blur` background blur for Northern Lights), and a picker in Profile.
  Default: Winter Frost. A `/preview` gallery shows them all without a backend.
- **QR invite** — tapping a group's invite-code card opens a `group-qr/[id]`
  modal with a scannable QR of the join link (`react-native-qrcode-svg`), so
  family can scan-to-join in person; a "Share link instead" fallback is there too.
- **Invite codes + join links** — short, unambiguous, revocable codes (migration
  `0003`) via `redeem_invite` / `rotate_invite_code` RPCs. The group screen
  shares a deep link (`giftwall://join/<CODE>`); opening it joins exactly that
  group (`src/app/join/[code].tsx`), and an unauthenticated opener finishes the
  join right after sign-in. The unique code prevents joining the wrong group.
- **Surprise Wall in the UI** — list owners never subscribe to or render claim
  state for their own list; everyone else sees claims update in real time.
  Buyers can flip a claim claimed→**purchased**, and items with a source URL show
  a tappable **View product ↗** link.
- **Performance** — list rows (`ItemRow`, group rows, wishlist rows) are
  `React.memo`'d with stable `useCallback` handlers (claim toggles read a
  `claimsRef` so they don't re-create on every claim change), so typing in
  search or toggling one claim doesn't re-render the whole list.
- **Search & feel** — a wishlist with 4+ items gets a client-side search box
  (title/note, with a "no matches" state); light haptic feedback on claim/purchase
  (native only); and a subtle press-scale on the claim button.
- **Multi-quantity claims** — a qty>1 item can be split across buyers (migration
  `0012`: per-buyer uniqueness + a quantity-cap trigger). The card shows
  "N of Q claimed" with a "Claim one" CTA until full; Surprise Wall unaffected
  (the recipient still sees no claims). Covered by `scripts/test-rls.mjs`.
- **Input validation** — pure validators in `src/lib/validation.ts`
  (`parsePriceToCents`, `clampQuantity`, `isSafeHttpUrl`, `clampLen`, unit-tested):
  price ≥0 and quantity 1–999 are clamped, product links are checked to be
  http(s) before opening (toast otherwise), and titles/notes/comments/names are
  length-capped.
- **Empty-list suggestions** — an owner's empty wishlist shows tappable
  category chips (Books, Kitchen, Cozy, Tech, Experiences, …) that prefill the
  add form's name field (via a `seedTitle` prop on `ItemForm`) to beat the
  blank-page problem.
- **Bulk paste add** — paste several product links at once (a unit-tested
  `splitUrls()` keeps the valid http(s) ones) and each becomes its own scraped
  item; single-link behavior is unchanged.
- **Item details** — title, link (with scrape), price, **quantity** (migration
  `0006`), a free-text **note**, a **most-wanted** flag (migration `0007`,
  sorted first), and a manually-uploaded **photo** (item-images Storage bucket +
  per-user-folder RLS, migration `0014`), via a shared `ItemForm` used for both
  adding (inline) and editing (modal at `edit-item/[id]`). Cards show qty, note,
  image, and a ★ badge.
- **Member management** — group admins can remove members or promote/demote
  admins (migration `0005`, `is_group_admin` RLS); everyone can self-leave.
- **Group & list management** — admins can rename or delete a group
  (`edit-group/[id]` modal; delete policy in migration `0011`, cascades
  everything); list owners can delete their own wishlist. Both RLS-enforced and
  covered by `scripts/test-rls.mjs`.
- **Activity feed** — group log of lists created, items added, and members
  joined (migration `0008`, written only by `SECURITY DEFINER` triggers).
  Surprise-Wall-safe by construction: claims/purchases are never logged, so a
  recipient can't infer who's buying for them. Reached from the group screen.
- **Per-item discussion** — comments on an item so buyers coordinate (migration
  `0009`). Visibility reuses `can_see_claims_for_item()`, so the recipient can
  neither read nor post on items in their own list. "💬 Discuss" on non-owner rows.
- **Realtime** — claims, comments, and the activity feed update live via
  RLS-enforced `postgres_changes` (publication set in migrations `0001`/`0013`);
  the recipient still receives nothing for their own items.
- **Offline queue** — claims, comments, and item-adds that fail while offline are
  queued (`src/data/offline/queue.ts`) and replayed on reconnect/login via
  `syncOfflineMutations()`. Still a lightweight stub (no local-first reads).
- **Link scraping** — `supabase/functions/scrape-link` parses OpenGraph with
  SSRF protection (https only, DNS resolved + checked against private ranges,
  redirects re-validated per hop). Falls back to manual entry on failure.
- **Push notifications** — `push_tokens` table + RLS, client registration
  (`src/lib/notifications.ts`), and `supabase/functions/send-push` fanning out
  to group members (never the recipient) on new items.

Validated: `npx tsc --noEmit` clean (app code) and `npx expo export --platform
ios` bundles 1200+ modules with no resolution errors. UI has not been exercised
in a simulator yet — that needs a linked Supabase project and a dev build.

## Builds, crash reporting & store assets

- **EAS builds** — `eas.json` defines `development` (dev client + simulator),
  `preview` (internal distribution), and `production` (auto-increment) profiles.
  `npx eas build --profile preview --platform ios` (after `eas init`).
- **Crash reporting** — Sentry is wired via `@sentry/react-native` + its Expo
  config plugin and `src/lib/monitoring.ts`. It **no-ops until** you set
  `EXPO_PUBLIC_SENTRY_DSN` (in EAS env / `.env`), so dev stays quiet. Use
  `captureError()` from that module for handled errors.
- **Store assets (still the Expo defaults — replace before submission):**
  - App icon: `assets/images/icon.png` — **1024×1024** PNG, no transparency for iOS.
  - Android adaptive: `android-icon-foreground.png` / `-background.png` / `-monochrome.png` (1024×1024, foreground art within the safe ~66% center).
  - Splash: `assets/images/splash-icon.png` — ~**300×300** logo on the `#208AEF` background (configured in the expo-splash-screen plugin).
  - Web favicon: `assets/images/favicon.png`.
  Generate from one source with `npx expo-optimize` / the Expo asset tooling, or
  design 1024² art and let EAS derive the rest.

## Deep links

Invite links are built in one place — `src/lib/links.ts` (`inviteUrl` /
`inviteMessage`), used by the group screen and the QR screen. The shape depends
on `EXPO_PUBLIC_WEB_URL`:

- **Unset** → `giftwall://join/<CODE>` (custom scheme). Only opens on a device
  that already has the app; in a browser or for a non-installer it dead-ends.
- **Set** (e.g. `https://giftwall.app`) → `https://giftwall.app/join/<CODE>`.
  A recipient without the app lands on the **web app's own `/join/[code]`
  route** instead of nothing, and once you do the two operator steps below the
  same link becomes a true **Universal Link (iOS) / App Link (Android)** that
  opens the installed app directly:

  1. **Host the association files** at that origin:
     `/.well-known/apple-app-site-association` (the `com.giftwall.app`
     app ID + `/join/*` paths) and `/.well-known/assetlinks.json` (the Android
     package + signing-cert SHA-256).
  2. **Add the domain to native config** — `ios.associatedDomains:
     ["applinks:giftwall.app"]` and an Android `intentFilters` entry for the
     `https` host — then rebuild (links can't be added over-the-air).

Until then, set `EXPO_PUBLIC_WEB_URL` anyway: the graceful web-app fallback is
already a strict upgrade over the dead custom-scheme link.

## Share extension (native)

Registering giftwall as a target in the iOS/Android **share sheet** (so a product
page in Safari/Chrome can be "shared to giftwall") needs a native module +
config plugin, so it only runs on a **dev/production build**, not Expo Go or web.
The app-side handoff is already done — `src/lib/share-intent.ts`'s
`pendingSharedUrl` is read by `ItemForm` (prefills the URL) and the groups screen
(nudges the user). All that's missing is the OS capture, which is one dependency
plus a few lines at the root.

When [`expo-share-intent`](https://github.com/achorein/expo-share-intent)
publishes an Expo **SDK 56**–compatible release (6.1.1 still pins `expo@^55`, so
`npx expo install expo-share-intent` currently aborts on a peer conflict — force
it with `--legacy-peer-deps` only on a throwaway branch):

1. **Add the config plugin** to `app.json` `plugins`:
   ```json
   ["expo-share-intent", { "iosActivationRules": { "NSExtensionActivationSupportsWebURLWithMaxCount": 1 } }]
   ```
2. **Wrap the root** (`src/app/_layout.tsx`) in `ShareIntentProvider`, and in a
   child component call the hook and stash the URL:
   ```tsx
   import { useShareIntent } from "expo-share-intent";
   import { pendingSharedUrl } from "@/lib/share-intent";
   const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
   useEffect(() => {
     const url = shareIntent.webUrl ?? shareIntent.text;
     if (hasShareIntent && url) {
       void pendingSharedUrl.set(url);   // ItemForm + groups screen take it from here
       resetShareIntent();
     }
   }, [hasShareIntent, shareIntent]);
   ```
3. **Keep web green** — the hook is native-only; import it in a `*.native.tsx`
   module (or guard with `Platform.OS !== "web"`) so it never enters the web
   bundle, exactly as `/scan` does for the camera.
4. **Rebuild** (`npx expo prebuild` + `npx expo run:ios` / `run:android`) — a
   share extension can't be added over-the-air. Then share a link from Safari and
   confirm it lands in the next item you add.

## What truly remains before launch

The app feature set is complete, but everything below has only been validated by
TypeScript + a web bundle + the `/preview` gallery. It has **never run against a
real backend or on a device.** In rough order:

1. **Run the backend for real** — create a Supabase project, apply migrations
   `0001`–`0016` in order, and run `npm run test:rls` (see `VALIDATION.md`). The
   Surprise Wall RLS, triggers (activity, claim cap), and policies are reviewed
   but **never executed**. This is the single most important step.
2. **Deploy the Edge Functions** (`scrape-link`, `send-push`, `delete-account`)
   and set their secrets / the `items` push webhook.
3. **Device run** — `npx expo run:ios` / `run:android` dev build to exercise
   native sign-in (Apple/Google), push notifications, image upload, and realtime.
   Email OTP + most flows also work in Expo Go.
4. **Store assets & secrets** — real app icon/splash (defaults still in place),
   a Sentry DSN, a hosted Privacy Policy/Terms URL, and the real support email.
5. **Nice-to-haves** — local-first offline reads (queue is write-only today),
   richer profiles, and seasonal scaling (read replicas, image CDN) when load
   justifies it.

Run `npm run lint` and `npx tsc --noEmit` before commits; re-run
`npm run test:rls` after any change to a `*.sql` policy.
