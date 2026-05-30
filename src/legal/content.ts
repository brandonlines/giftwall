// Canonical legal copy, rendered in-app by app/legal/[doc].tsx and mirrored in
// PRIVACY.md / TERMS.md at the repo root for public hosting (the app stores
// require a publicly reachable Privacy Policy URL). Keep all three in sync.
//
// NOTE: this is a practical template, not legal advice. Replace the contact
// email and jurisdiction, and have it reviewed before public launch.

export const LAST_UPDATED = "2026-05-29";
export const SUPPORT_EMAIL = "support@giftwall.app"; // TODO: real address

export type LegalSection = { title: string; body: string[] };

export const PRIVACY: LegalSection[] = [
  {
    title: "What giftwall is",
    body: [
      "giftwall is a shared gift-wishlist app. Its defining feature is the Surprise Wall: the owner of a wishlist can never see who has claimed or purchased items on their own list.",
    ],
  },
  {
    title: "Information we collect",
    body: [
      "Account: your email address (for sign-in) and, if you use them, your Apple or Google sign-in identifiers.",
      "Profile: a display name and optional avatar photo you choose.",
      "Content you create: groups you join, wishlists and items (titles, links, prices, notes, quantities), gift claims and purchase status, and comments.",
      "Device: an Expo push-notification token and your platform (iOS/Android) so we can send group alerts.",
      "When you paste a product link, our server fetches that page to read its title, image and price (OpenGraph metadata).",
    ],
  },
  {
    title: "How the Surprise Wall protects you",
    body: [
      "Claims, purchase status and item discussion are enforced at the database level with Row-Level Security. A list owner's requests for that data return nothing — the privacy is not a UI trick and cannot be bypassed by inspecting network traffic.",
    ],
  },
  {
    title: "How we use your information",
    body: [
      "To operate the app: show your groups and lists, coordinate gifts, and send notifications you opt into.",
      "We do not sell your personal information and do not use it for advertising.",
    ],
  },
  {
    title: "Service providers",
    body: [
      "Supabase (database, authentication, file storage) hosts your data.",
      "Apple Push Notification service and Firebase Cloud Messaging deliver notifications.",
      "When scraping a product link, the request goes to the retailer you linked.",
    ],
  },
  {
    title: "Your rights",
    body: [
      "Export: Profile → Your data → Export my data downloads a JSON copy of your data.",
      "Deletion: Profile → Your data → Delete account permanently removes your profile, lists, items, claims and comments. This is irreversible.",
      `Questions: contact ${SUPPORT_EMAIL}.`,
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
