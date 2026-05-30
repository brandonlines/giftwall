# giftwall — Privacy Policy

_Last updated: 2026-05-29_

> Practical template, not legal advice. Replace the contact email and have it
> reviewed before public launch. Host this at a public URL and put that URL in
> your App Store / Play Store listing and in `app.json`. The in-app copy lives
> in `src/legal/content.ts` — keep them in sync.

## What giftwall is
giftwall is a shared gift-wishlist app. Its defining feature is the **Surprise
Wall**: the owner of a wishlist can never see who has claimed or purchased items
on their own list.

## Information we collect
- **Account:** your email address (for sign-in) and, if used, your Apple/Google sign-in identifiers.
- **Profile:** a display name and optional avatar photo you choose.
- **Content you create:** groups, wishlists and items (titles, links, prices, notes, quantities), gift claims and purchase status, and comments.
- **Device:** an Expo push-notification token and your platform (iOS/Android) for group alerts.
- When you paste a product link, our server fetches that page to read its title, image and price (OpenGraph metadata).

## How the Surprise Wall protects you
Claims, purchase status and item discussion are enforced at the database level
with Row-Level Security. A list owner's requests for that data return nothing —
the privacy is not a UI trick and cannot be bypassed by inspecting network traffic.

## How we use your information
To operate the app: show your groups and lists, coordinate gifts, and send
notifications you opt into. We do **not** sell your personal information and do
**not** use it for advertising.

## Service providers
- **Supabase** — database, authentication, file storage.
- **Apple Push Notification service / Firebase Cloud Messaging** — notifications.
- **Retailers** — when you scrape a product link, the request goes to that retailer.

## Your rights
- **Export:** Profile → Your data → Export my data (JSON copy).
- **Deletion:** Profile → Your data → Delete account (permanent, irreversible).
- **Questions:** support@giftwall.app.

## Children
giftwall is intended for general/family audiences and is not directed to
children under 13.

## Changes
We'll update this policy as the app evolves and revise the date above. Material
changes will be surfaced in-app.

---

## Store data-safety summary (for the submission forms)
For Apple App Privacy / Google Data safety, declare:
- **Contact info — Email address:** collected, linked to identity, for app
  functionality (account/auth). Not used for tracking.
- **User content — Photos (avatar), other (wishlist items, comments):**
  collected, linked to identity, for app functionality. Not used for tracking.
- **Identifiers — User ID:** collected, linked to identity, app functionality.
- **Push token:** collected for notifications.
- **Not collected:** location, contacts, browsing history, financial info.
- **No third-party advertising, no tracking across apps.**
- Data is **deletable in-app** (account deletion) and **exportable in-app**.

