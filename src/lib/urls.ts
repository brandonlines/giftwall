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
