// String catalog. One flat key→text map per locale. Add new locales as sibling
// keys (e.g. `es`) with the same keys; the t() helper falls back to `en`.
export const strings = {
  en: {
    "common.profile": "Profile",
    "common.cancel": "Cancel",

    "signin.subtitle": "Shared wishlists, surprises kept secret.",
    "signin.emailPlaceholder": "you@example.com",
    "signin.sendCode": "Email me a code",
    "signin.codeHint": "Enter the 6-digit code sent to {email}.",
    "signin.codePlaceholder": "123456",
    "signin.verify": "Verify & sign in",
    "signin.differentEmail": "Use a different email",
    "signin.or": "or",
    "signin.google": "Continue with Google",

    "groups.empty":
      "No groups yet. Create one below, or join with a code from a family member.",
    "groups.createSection": "Create a group",
    "groups.namePlaceholder": "e.g. The Lines Family",
    "groups.create": "Create",
    "groups.joinSection": "Join a group",
    "groups.joinPlaceholder": "Paste group code",
    "groups.join": "Join",
  },
} as const;

export type StringKey = keyof (typeof strings)["en"];
