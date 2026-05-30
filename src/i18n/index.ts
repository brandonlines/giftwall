import * as Localization from "expo-localization";
import { strings, type StringKey } from "./strings";

// Picks the device language (e.g. "es") if we have a catalog for it, else "en".
// Guarded so it can never throw at import time.
function detectLocale(): keyof typeof strings {
  try {
    const code = Localization.getLocales()?.[0]?.languageCode;
    if (code && code in strings) return code as keyof typeof strings;
  } catch {
    /* fall through */
  }
  return "en";
}

const locale = detectLocale();

export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let out: string = strings[locale][key] ?? strings.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out;
}
