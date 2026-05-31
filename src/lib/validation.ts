// Pure input validators/sanitizers (no React / no backend) — unit-tested.

export const LIMITS = {
  title: 120,
  note: 1000,
  comment: 1000,
  name: 60,
} as const;

// Parses a user-typed price into integer cents. Returns null for empty/invalid
// or negative input (we never store a negative price).
export function parsePriceToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// Clamps a quantity to a sane integer range (1..999), defaulting to 1.
export function clampQuantity(input: string | number): number {
  const n = typeof input === "number" ? input : parseInt(input, 10);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(999, Math.floor(n)));
}

// Only http(s) links are safe to open (blocks javascript:, file:, etc.).
export function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Trims and caps a string to a max length.
export function clampLen(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

// Public-profile handle. Lowercased; spaces and runs of other characters
// collapse to a single underscore; trimmed to [a-z0-9_]. Returns "" if nothing
// usable remains. The DB enforces the same `^[a-z0-9_]{3,30}$` shape.
export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

export function isValidUsername(input: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(input);
}
