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
