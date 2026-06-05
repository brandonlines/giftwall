// Canonical legal copy, rendered in-app by app/legal/[doc].tsx and mirrored in
// PRIVACY.md / TERMS.md at the repo root for public hosting (the app stores
// require a publicly reachable Privacy Policy URL). Keep all three in sync.
//
// NOTE: this is a practical template, not legal advice. Replace the contact
// email and jurisdiction, and have it reviewed before public launch.

export const LAST_UPDATED = "2026-06-05";
export const SUPPORT_EMAIL = "support@gift-well.ca";

export type LegalSection = { title: string; body: string[] };

export const PRIVACY: LegalSection[] = [
  {
    title: "What giftwall is",
    body: [
      "giftwall is a shared gift-wishlist app for families and groups. Its defining feature is the Surprise Wall: the owner of a wishlist can never see who has claimed, reserved, contributed to, or purchased items on their own list, so the surprise is preserved.",
    ],
  },
  {
    title: "Information we collect",
    body: [
      "Account: your email address (for sign-in) and, if you use them, your Apple or Google sign-in identifiers. Sign in with Apple may share your name and email (you can choose to hide your email).",
      "Profile: a display name, plus — all optional — an avatar photo, a shipping address (shown only to people in your groups so they can send you gifts), a birthday (used for friendly reminders to your groups), and a public username if you choose to claim one.",
      "Content you create: groups, wishlists and items (titles, links, prices, notes, quantities, photos), gift claims and purchase status, group-gift contributions, reservations, comments, reactions, group chat messages, thank-you notes, and Secret Santa selections.",
      "Public profile (optional): if you claim a username and mark a list as public, that list and its items become viewable by anyone at gift-well.ca/u/your-username. Who claimed or is buying what is never shown publicly.",
      "Device: an Expo push-notification token and your platform (iOS/Android), so we can send the alerts you opt into.",
      "Links you paste: when you add a product by link, our server fetches that page to read its title, image and price.",
      "Barcodes you scan: when you scan a product barcode in-store, the barcode number is sent to Open Food Facts to look up the product.",
    ],
  },
  {
    title: "The Gift Assistant (AI)",
    body: [
      "If you use the optional AI Gift Assistant, the recipient details you type into it — such as your relationship to the person, their interests, the occasion, a budget, and any notes — are sent to Google's Gemini API to generate gift ideas.",
      "We do not send your name, email, or account identity to the AI provider, and we do not store your prompts or the AI's answers. We keep only a per-day usage count to prevent abuse.",
      "Please don't enter anything into the assistant that you wouldn't want processed by a third-party AI service.",
    ],
  },
  {
    title: "How the Surprise Wall protects you",
    body: [
      "Claims, purchase status, reservations, group-gift contributions and item discussion are enforced at the database level with Row-Level Security. A list owner's requests for that data return nothing — over the API or live updates — so the privacy is not a UI trick and cannot be bypassed by inspecting network traffic.",
      "After an occasion, a gift is revealed to the recipient only if both sides opt in (the recipient asks to see, and the giver chooses to reveal). Secret Santa draws are stricter still: each person can see only the one name they drew — not even the organizer can see the full list.",
    ],
  },
  {
    title: "How we use your information",
    body: [
      "To operate the app: show your groups and lists, coordinate gifts, generate AI suggestions when you ask, and send the notifications you opt into.",
      "Notifications can include item names, member names, occasion reminders, and thank-you messages. You can turn each type off in Profile and remove your device at any time.",
      "We do not sell your personal information and do not use it for advertising or cross-app tracking. The app contains no analytics or advertising SDKs.",
    ],
  },
  {
    title: "Affiliate links",
    body: [
      "Some outbound Amazon product links may include an Amazon Associates tag. If you buy through one of those links, we may earn a small commission at no extra cost to you. This never changes what you see, and we don't share your identity with Amazon to do it.",
    ],
  },
  {
    title: "Service providers",
    body: [
      "Supabase — hosts your data (database, authentication, file storage) and powers real-time updates.",
      "Apple and Google — provide Sign in with Apple and Google sign-in; Google also provides the Gemini AI used by the Gift Assistant.",
      "Expo — delivers push notifications (via the Expo Push Service) and over-the-air app updates.",
      "Sentry — receives crash and error diagnostics so we can fix bugs. We disable personal-data collection in Sentry, though crash reports can still incidentally contain technical details.",
      "Open Food Facts — resolves scanned barcodes to product names and images.",
      "Retailers — when you paste or open a product link, a request is made to that retailer's site.",
      "We share only what each provider needs to do its job, and we don't sell your data to anyone.",
    ],
  },
  {
    title: "Where your data is processed",
    body: [
      "Your data is stored and processed by the providers above, whose servers may be located in the United States, the European Union, or other regions. By using giftwall you understand your information may be processed outside your country.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "Export: Profile → Your data → Export my data downloads a JSON copy of your profile, groups, lists, items, claims and comments.",
      "Deletion: Profile → Your data → Delete account permanently and irreversibly deletes your account and the data tied to it (profile, memberships, lists, items, claims, contributions, reservations, comments, messages, reactions, push tokens and more).",
      "Depending on where you live, you may have additional rights to access, correct, or restrict the use of your data. Contact us to exercise them.",
      `Questions or requests: ${SUPPORT_EMAIL}.`,
    ],
  },
  {
    title: "Security",
    body: [
      "Every table is protected by Row-Level Security, so you can only ever read the data you're entitled to. Sign-in uses Apple, Google, or a one-time email code, and the server keys that could bypass these rules are never shipped inside the app.",
    ],
  },
  {
    title: "Children",
    body: [
      "giftwall is intended for general/family audiences and is not directed to children under 13. Please don't create an account for a child under 13.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We'll update this policy as the app evolves and revise the date below. Material changes will be surfaced in-app.",
    ],
  },
];

export const TERMS: LegalSection[] = [
  {
    title: "Acceptance",
    body: [
      "By using giftwall you agree to these Terms. If you don't agree, please don't use the app.",
    ],
  },
  {
    title: "Your account",
    body: [
      "You're responsible for activity under your account and for keeping your sign-in secure. You must provide an accurate email address.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "Be kind. Don't post unlawful, hateful, or infringing content; don't harass other members; don't attempt to defeat the Surprise Wall or access groups you weren't invited to; don't abuse the link-preview feature to attack other systems.",
    ],
  },
  {
    title: "Your content",
    body: [
      "You keep ownership of the content you add. You grant us a limited licence to store and display it to the group members who are entitled to see it, solely to operate the app.",
      "Don't post abusive, harassing, or objectionable content. You can report content or block another member from the comment or chat where it appears, or from a group's member list; reports are reviewed and acted on promptly. We may remove content or suspend accounts that break these rules.",
    ],
  },
  {
    title: "AI suggestions",
    body: [
      "The optional Gift Assistant uses AI to suggest gift ideas from what you type. Suggestions may be inaccurate, unavailable, or unsuitable — treat them as ideas, not advice, and check details (including price and availability) before buying. You're responsible for what you enter; don't include anything you wouldn't want processed by a third-party AI service.",
    ],
  },
  {
    title: "Affiliate links",
    body: [
      "Some links to retailers (such as Amazon) may include an affiliate tag, and we may earn a commission on qualifying purchases at no extra cost to you. This never changes the price you pay or what we show you.",
    ],
  },
  {
    title: "Termination",
    body: [
      "You can delete your account at any time from Profile → Your data. We may suspend accounts that violate these Terms.",
    ],
  },
  {
    title: "Disclaimer & liability",
    body: [
      "giftwall is provided “as is” without warranties. Prices and product details from scraped links may be inaccurate. To the extent permitted by law, we aren't liable for indirect or incidental damages arising from use of the app.",
    ],
  },
  {
    title: "Contact",
    body: [`Questions about these Terms: ${SUPPORT_EMAIL}.`],
  },
];
