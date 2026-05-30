import { strings, type StringKey } from "./strings";

// Minimal, dependency-free i18n. Today it's English-only; the structure lets us
// add locales without touching call sites. To go multi-locale later, detect the
// device locale (e.g. expo-localization) and set `locale` accordingly.
const locale: keyof typeof strings = "en";

export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let out: string = strings[locale][key] ?? strings.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out;
}
