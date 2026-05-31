# App Store listing — giftwall

Copy/paste-ready text for App Store Connect, plus what you still need to provide.
Character limits are Apple's; counts are approximate.

## Names & identifiers

- **App Name** (30): `giftwall`
- **Subtitle** (30): `Shared wishlists, kept secret`
- **Bundle ID:** `com.giftwall.app`
- **Primary category:** Lifestyle  ·  **Secondary:** Shopping
- **Age rating:** 4+ (no objectionable content)

## Promotional text (170)

> Group gift lists where the surprise actually holds — recipients never see who claimed what. Share wishlists, claim gifts, chip in together, and keep every surprise safe.

## Description

> **giftwall is the group gift-list app that finally keeps the surprise.**
>
> Make a group with your family or friends, share wishlists, and claim the gifts you'll buy. The magic: the person whose list it is can **never** see who claimed or bought what. The "Surprise Wall" is enforced by the database itself — so surprises stay airtight, not just hidden in the app.
>
> **WHY GIFTWALL**
> • Shared wishlists for the whole group
> • The Surprise Wall — recipients never see claims, ever
> • Claim gifts so nobody buys duplicates
> • Group gifting — chip in together on bigger gifts (kept secret too)
> • Paste any product link to auto-fill the name, price & photo
> • Occasions & countdowns for birthdays and holidays
> • React to gift ideas with ❤️ 👍 🎉
> • Your shopping list across every group, with tap-to-check-off
> • Private discussion on each gift (hidden from the recipient)
> • Sign in with Apple
>
> Perfect for family Christmas, birthdays, weddings, and baby showers — any time a group needs to coordinate gifts without spoiling the surprise.
>
> Your privacy is the product: the surprise is enforced with database row-level security, never a client-side filter a bug could defeat.

## Keywords (100, comma-separated, no spaces)

```
wishlist,gift,gifts,registry,family,christmas,birthday,secret santa,group,present,surprise,shopping
```

## URLs you must provide

- **Support URL:** a page or email you control (e.g. a simple site or `mailto:` support address).
- **Marketing URL** (optional): a landing page.
- **Privacy Policy URL:** REQUIRED. Host `docs/privacy.html` (see `docs/README.md`) and paste the public URL.

## Screenshots plan (6.7" iPhone required; 6.5" recommended)

Capture these on the device build (Settings → switch themes for variety):
1. **Sign-in** — the branded logo + "surprises kept secret."
2. **A wishlist with items** — show priority ★, prices, a product photo.
3. **The Surprise Wall banner** on a recipient's own list (the differentiator).
4. **Claiming a gift** — "You're buying this ✓" on a member's view.
5. **Group gifting** — the chip-in progress bar.
6. **Occasions/countdown** + reactions.

Add a one-line caption to each (Apple shows them). Tip: use the iOS simulator
(`eas build --profile development` with `ios.simulator: true`) for clean,
status-bar-perfect frames, or screenshot on your phone.

## TestFlight "What to Test" (external testers)

> Sign in with Apple, create a group, share the invite code, add a few items to a wishlist, then claim one from another account. Confirm the list owner can't see who claimed their items. Try "Group gift" to chip in together, and react to an item.

## Review notes

> Sign in with Apple — reviewers can use their own Apple ID; no demo account needed. The app's core privacy guarantee (recipients can't see claims) is enforced server-side by Postgres row-level security.

## Export compliance

Already answered in the build: uses only standard/exempt encryption
(`ITSAppUsesNonExemptEncryption: false` in `app.json`).
