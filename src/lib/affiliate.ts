// Affiliate link wrapping (revenue). Pure + unit-tested.
//
// When a user opens a product link we own the referral, so we append our
// affiliate parameter for retailers we're enrolled with. Today that's Amazon
// Associates (one `tag` query param across all locales); the rule table is
// structured so more networks slot in later.
//
// The tag is NOT a secret — it's visible in every affiliate URL — so it ships in
// the client via EXPO_PUBLIC_AMAZON_TAG. With no tag configured, links pass
// through untouched.

const DEFAULT_AMAZON_TAG = process.env.EXPO_PUBLIC_AMAZON_TAG?.trim() || "";

// Amazon storefront hosts across locales (amazon.com, .ca, .co.uk, .co.jp, …).
const AMAZON_HOST =
  /(^|\.)amazon\.(com|ca|com\.mx|com\.br|co\.uk|de|fr|es|it|nl|se|pl|com\.au|co\.jp|in|sg|ae|sa|com\.tr)$/i;

/**
 * Returns `rawUrl` wrapped with our affiliate parameter when it points at a
 * supported retailer and a tag is configured; otherwise returns it unchanged.
 * Never throws — invalid or non-http(s) input is returned as-is.
 */
export function affiliateUrl(rawUrl: string, amazonTag: string = DEFAULT_AMAZON_TAG): string {
  if (!rawUrl) return rawUrl;
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return rawUrl;

  if (amazonTag && AMAZON_HOST.test(u.hostname)) {
    u.searchParams.set("tag", amazonTag);
    return u.toString();
  }

  return rawUrl;
}

/** True if we'd monetize this URL given a configured tag (for UI hints/tests). */
export function isAffiliable(rawUrl: string): boolean {
  try {
    return AMAZON_HOST.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}
