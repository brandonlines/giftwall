import { isSafeHttpUrl } from "./validation";

// Splits a blob of pasted text into the distinct, valid http(s) URLs it
// contains (whitespace/newline separated), de-duplicated and in order. Powers
// "paste several links at once". Pure + unit-tested.
export function splitUrls(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of text.split(/\s+/)) {
    const t = token.trim();
    if (t && isSafeHttpUrl(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

// The first safe http(s) URL embedded in a blob of text, or null. Lets a link
// shared into the app — often wrapped in chatter like "check this out <url>" —
// drop into the add form clean instead of pasting the whole sentence.
export function firstUrl(text: string): string | null {
  return splitUrls(text)[0] ?? null;
}
