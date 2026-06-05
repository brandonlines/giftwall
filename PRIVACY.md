# giftwall — Privacy Policy

_Last updated: 2026-06-05_

> Practical template, not legal advice. Replace the contact email and confirm the
> jurisdiction/data-residency details, and have it reviewed before public launch.
> Host this at a public URL and put that URL in your App Store / Play Store
> listing and in `app.json`. The in-app copy lives in `src/legal/content.ts` and
> the hosted HTML in `docs/privacy.html` — keep all three in sync.

## What giftwall is
giftwall is a shared gift-wishlist app for families and groups. Its defining
feature is the **Surprise Wall**: the owner of a wishlist can never see who has
claimed, reserved, contributed to, or purchased items on their own list, so the
surprise is preserved.

## Information we collect
- **Account:** your email address (for sign-in) and, if you use them, your Apple or Google sign-in identifiers. Sign in with Apple may share your name and email (you can choose to hide your email).
- **Profile:** a display name, plus — all optional — an avatar photo, a shipping address (shown only to people in your groups so they can send you gifts), a birthday (used for friendly reminders to your groups), and a public username if you choose to claim one.
- **Content you create:** groups, wishlists and items (titles, links, prices, notes, quantities, photos), gift claims and purchase status, group-gift contributions, reservations, comments, reactions, group chat messages, thank-you notes, and Secret Santa selections.
- **Public profile (optional):** if you claim a username and mark a list as public, that list and its items become viewable by anyone at `gift-well.ca/u/your-username`. Who claimed or is buying what is never shown publicly.
- **Device:** an Expo push-notification token and your platform (iOS/Android), so we can send the alerts you opt into.
- **Links you paste:** when you add a product by link, our server fetches that page to read its title, image and price.
- **Barcodes you scan:** when you scan a product barcode in-store, the barcode number is sent to Open Food Facts to look up the product.

## The Gift Assistant (AI)
If you use the optional AI Gift Assistant, the recipient details you type into it
— such as your relationship to the person, their interests, the occasion, a
budget, and any notes — are sent to **Google's Gemini API** to generate gift
ideas. We do **not** send your name, email, or account identity to the AI
provider, and we do **not** store your prompts or the AI's answers; we keep only
a per-day usage count to prevent abuse. Please don't enter anything into the
assistant that you wouldn't want processed by a third-party AI service.

## How the Surprise Wall protects you
Claims, purchase status, reservations, group-gift contributions and item
discussion are enforced at the database level with Row-Level Security. A list
owner's requests for that data return nothing — over the API or live updates — so
the privacy is not a UI trick and cannot be bypassed by inspecting network
traffic. After an occasion, a gift is revealed to the recipient only if **both**
sides opt in (the recipient asks to see, and the giver chooses to reveal). Secret
Santa draws are stricter still: each person can see only the one name they drew —
not even the organizer can see the full list.

## How we use your information
To operate the app: show your groups and lists, coordinate gifts, generate AI
suggestions when you ask, and send the notifications you opt into. Notifications
can include item names, member names, occasion reminders, and thank-you messages
— you can turn each type off in Profile and remove your device at any time. We do
**not** sell your personal information and do **not** use it for advertising or
cross-app tracking. The app contains no analytics or advertising SDKs.

## Affiliate links
Some outbound Amazon product links may include an Amazon Associates tag. If you
buy through one of those links, we may earn a small commission at no extra cost
to you. This never changes what you see, and we don't share your identity with
Amazon to do it.

## Service providers
- **Supabase** — hosts your data (database, authentication, file storage) and powers real-time updates.
- **Apple and Google** — provide Sign in with Apple and Google sign-in; Google also provides the Gemini AI used by the Gift Assistant.
- **Expo** — delivers push notifications (via the Expo Push Service) and over-the-air app updates.
- **Sentry** — receives crash and error diagnostics so we can fix bugs. We disable personal-data collection in Sentry, though crash reports can still incidentally contain technical details.
- **Open Food Facts** — resolves scanned barcodes to product names and images.
- **Retailers** — when you paste or open a product link, a request is made to that retailer's site.

We share only what each provider needs to do its job, and we don't sell your data
to anyone.

## Where your data is processed
Your data is stored and processed by the providers above, whose servers may be
located in the United States, the European Union, or other regions. By using
giftwall you understand your information may be processed outside your country.

## Your rights
- **Export:** Profile → Your data → Export my data downloads a JSON copy of your profile, groups, lists, items, claims and comments.
- **Deletion:** Profile → Your data → Delete account permanently and irreversibly deletes your account and the data tied to it (profile, memberships, lists, items, claims, contributions, reservations, comments, messages, reactions, push tokens and more).
- Depending on where you live, you may have additional rights to access, correct, or restrict the use of your data. Contact us to exercise them.
- **Questions or requests:** support@gift-well.ca.

## Security
Every table is protected by Row-Level Security, so you can only ever read the data
you're entitled to. Sign-in uses Apple, Google, or a one-time email code, and the
server keys that could bypass these rules are never shipped inside the app.

## Children
giftwall is intended for general/family audiences and is not directed to children
under 13. Please don't create an account for a child under 13.

## Changes
We'll update this policy as the app evolves and revise the date above. Material
changes will be surfaced in-app.

---

## Store data-safety summary (for the submission forms)
For Apple App Privacy / Google Data safety, declare:
- **Contact info — Email address:** collected, linked to identity, app functionality (account/auth). Not for tracking.
- **Contact info — Physical address (optional shipping address):** collected, linked, app functionality.
- **User content — Photos (avatar, item images, group covers) and other (wishlist items, notes, comments, group messages, thank-you notes):** collected, linked, app functionality.
- **Identifiers — User ID:** collected, linked, app functionality.
- **Other data — Date of birth (optional birthday):** collected, linked, app functionality.
- **Other user content sent to a third party — AI Gift Assistant inputs:** the recipient details you type are sent to Google (Gemini) to generate suggestions; **not stored by us**. Disclose as data shared with a third-party service provider for functionality.
- **Diagnostics — Crash data / performance data (Sentry):** collected, **not linked** to identity (PII disabled), app functionality.
- **Push token:** collected for notifications.
- **Not collected:** precise location, contacts, browsing history, financial/payment info, health.
- **No third-party advertising and no tracking across apps.** Amazon Associates affiliate tags attribute purchases but do not share user identity and are not user tracking.
- Data is **deletable in-app** (account deletion) and **exportable in-app**.
