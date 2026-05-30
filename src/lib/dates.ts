// Pure date helpers for occasion countdowns (no React / no backend) —
// unit-tested. All comparisons are done at UTC midnight to avoid timezone/DST
// off-by-one drift.

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// Whole calendar days from today until `dateStr` (0 = today, 1 = tomorrow,
// negative = in the past). Returns NaN for an invalid date.
export function daysUntil(dateStr: string, now: number = Date.now()): number {
  if (!isValidDateStr(dateStr)) return NaN;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const n = new Date(now);
  const today = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

export function formatCountdown(dateStr: string, now: number = Date.now()): string | null {
  const d = daysUntil(dateStr, now);
  if (Number.isNaN(d)) return null;
  if (d === 0) return "Today!";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d > 1) return `in ${d} days`;
  return `${-d} days ago`;
}
