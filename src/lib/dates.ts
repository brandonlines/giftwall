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

// For a yearly-recurring occasion (a birthday), the *next* time it lands on or
// after today: this year's month/day if it hasn't passed yet, otherwise next
// year's. A one-off (recursYearly false) is returned unchanged, as is anything
// that isn't a valid YYYY-MM-DD. Feb 29 in a non-leap year rolls to Mar 1 (JS
// Date semantics), which is a fine display choice.
export function nextOccurrence(
  dateStr: string,
  recursYearly: boolean,
  now: number = Date.now(),
): string {
  if (!recursYearly || !isValidDateStr(dateStr)) return dateStr;
  const [, m, d] = dateStr.split("-").map(Number);
  const n = new Date(now);
  const today = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  let when = Date.UTC(n.getUTCFullYear(), m - 1, d);
  if (when < today) when = Date.UTC(n.getUTCFullYear() + 1, m - 1, d);
  const c = new Date(when);
  const mm = String(c.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(c.getUTCDate()).padStart(2, "0");
  return `${c.getUTCFullYear()}-${mm}-${dd}`;
}

// Countdown to the next occurrence of an occasion — rolls yearly-recurring dates
// forward so a birthday never reads "300 days ago".
export function occasionCountdown(
  dateStr: string,
  recursYearly: boolean,
  now: number = Date.now(),
): string | null {
  return formatCountdown(nextOccurrence(dateStr, recursYearly, now), now);
}
