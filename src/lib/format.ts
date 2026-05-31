// Pure formatting helpers (no React / no backend) — unit-tested.

// Symbols for the currencies a gift link is likely to use. Deliberately a small
// static map rather than Intl.NumberFormat: it's deterministic across Hermes/
// Node (Intl currency support varies by Hermes build) and needs no locale data.
// Unknown codes fall back to "CODE 12.34". Amounts keep two decimals (the app's
// price_cents model assumes minor units everywhere).
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", CAD: "$", AUD: "$", NZD: "$", SGD: "$", HKD: "$", MXN: "$",
  GBP: "£", EUR: "€", JPY: "¥", CNY: "¥", INR: "₹", BRL: "R$", KRW: "₩",
  CHF: "CHF ", SEK: "kr ", NOK: "kr ", DKK: "kr ", PLN: "zł ", ZAR: "R",
};

export function formatPrice(cents: number, currency: string | null): string {
  const [int, frac] = (cents / 100).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ","); // 1234 -> 1,234
  const amount = `${grouped}.${frac}`;
  if (!currency) return `$${amount}`;
  const code = currency.trim().toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code];
  return symbol ? `${symbol}${amount}` : `${code} ${amount}`;
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
