import * as Linking from "expo-linking";

// Builds the link that an invite shares. Two shapes, picked at runtime:
//
//   • If EXPO_PUBLIC_WEB_URL is set (e.g. https://giftwall.app), we emit an
//     https link — https://giftwall.app/join/<CODE>. That degrades gracefully:
//     a recipient without the app opens the web app's own /join/[code] route
//     instead of hitting a dead end, and once the operator hosts the Apple
//     App Site Association / Android assetlinks.json files at that domain and
//     adds it to the native config, the same link becomes a true Universal /
//     App Link that opens the installed app directly.
//
//   • Otherwise we fall back to the custom scheme (giftwall://join/<CODE>),
//     which only resolves on devices that already have the app installed.
//
// Centralising this here keeps the group screen and the QR screen in lockstep
// and gives us one seam to flip on universal links later.

function webBase(): string | null {
  const raw = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, ""); // drop any trailing slash so we don't double it
}

/** The shareable link a new member opens to join a specific group. */
export function inviteUrl(code: string): string {
  const base = webBase();
  return base ? `${base}/join/${code}` : Linking.createURL(`join/${code}`);
}

/** The message body for the OS share sheet — link plus the manual-entry code. */
export function inviteMessage(groupName: string, code: string): string {
  return (
    `Join "${groupName}" on giftwall:\n${inviteUrl(code)}\n\n` +
    `Or open the app and enter code ${code}.`
  );
}

// The product's canonical web home. Used for the public profile link even when
// EXPO_PUBLIC_WEB_URL isn't set at build time, so a shared profile is always a
// real https URL (the gift-well.ca/u/* path is served by the public-profile
// Edge Function — see supabase/functions/public-profile).
const CANONICAL_WEB = "https://www.gift-well.ca";

/** Public profile page for a handle: https://www.gift-well.ca/u/<username>. */
export function profileUrl(username: string): string {
  const base = webBase() ?? CANONICAL_WEB;
  return `${base}/u/${username}`;
}

/** Share-sheet body for a public profile. */
export function profileShareMessage(username: string): string {
  return `Here's my gift wishlist on giftwall 🎁\n${profileUrl(username)}`;
}
