// Pure formatting helpers (no React / no backend) — unit-tested.

export function formatPrice(cents: number, currency: string | null): string {
  const amount = (cents / 100).toFixed(2);
  return currency ? `${currency} ${amount}` : `$${amount}`;
}

// `now` is injectable so tests are deterministic.
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
