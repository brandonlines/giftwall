# giftwall — App Review notes

Paste into **App Store Connect → version → App Review Information → Notes**.
Keep the contact email + phone fields filled there too.

---

**What giftwall is**

A private, invite-only group gift-wishlist app for families and friends. Members create wishlists; others claim gifts to coordinate who is buying what. The defining feature is the **Surprise Wall**: a list's owner can never see who claimed or bought items on their *own* list — enforced by Postgres Row-Level Security, not just hidden in the UI.

**Signing in (no demo credentials needed)**

The quickest way in is **Sign in with Apple** — it creates an account instantly with no email round-trip. (One-time email codes and Google sign-in also work.) After signing in:

1. Tap **+ New group** → you get an invite code.
2. Open the group → **Add your wishlist** → add an item (paste a product link, type one, or 📷 scan a barcode).
3. Your own list shows a 🤫 banner — by design you cannot see claims on your own list (the Surprise Wall).
4. To see the claim flow, open the app on a second device/account, join with the invite code, open the list, and **Claim** an item. The owner's view never reveals it.

If you'd prefer a pre-provisioned account already in a populated group with a second member, email **support@gift-well.ca** and we'll set one up.

**Where the moderation tools are (Guideline 1.2)**

User-generated content (group chat, item comments) has Report + Block:

- **Report / Block content** — in a group's **Chat**, or an item's **💬 Discuss**, tap **Report** next to anyone else's message → choose **Report** (flags it for our review) or **Block**.
- **Block a person** — **Group → View members → tap a member → Block.**
- **Unblock** — **Profile → Blocked users → Unblock.**
- **Content policy** — **Profile → Terms of Service → Acceptable use.**

Blocking is symmetric (you each stop seeing the other's posts) and enforced server-side. Reports are reviewed and actioned within 24 hours.

**Privacy & data**

- **Account deletion in-app:** Profile → Your data → Delete account (permanent).
- **Data export in-app:** Profile → Your data → Export my data.
- The optional **AI Gift Assistant** sends only the recipient details you type (never your account identity) to Google's Gemini API; prompts are not stored.
- No third-party advertising, no cross-app tracking, no analytics SDKs.

**Permissions (all just-in-time, optional)**

- **Camera** — only to scan a product barcode in-store (you tap "Scan a barcode").
- **Photo library** — only when you choose a profile, group, or item photo.
- **Notifications** — optional group alerts you opt into.

**Technical**

Built with Expo / React Native; JS updates ship via EAS Update on the same app version (standard Expo OTA). Backend is Supabase.

**Contact:** support@gift-well.ca
