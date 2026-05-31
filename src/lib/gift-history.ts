// Pure helpers for the gift history timeline (no React / no backend) — tested.

export type GiftRecord = {
  id: string;
  title: string;
  // The other person: the recipient for a gift you gave, the giver for one you
  // received.
  personName: string;
  when: string; // ISO timestamp
  priceCents: number | null;
  kind: "gift" | "chipin";
};

export type YearGroup = { year: string; records: GiftRecord[] };

// Buckets records by calendar year (from the ISO `when`), newest year first and
// newest record first within each year.
export function groupByYear(records: GiftRecord[]): YearGroup[] {
  const byYear = new Map<string, GiftRecord[]>();
  for (const r of records) {
    const year = /^\d{4}/.test(r.when) ? r.when.slice(0, 4) : "—";
    const arr = byYear.get(year) ?? [];
    arr.push(r);
    byYear.set(year, arr);
  }
  return [...byYear.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([year, recs]) => ({
      year,
      records: [...recs].sort((a, b) => (a.when < b.when ? 1 : -1)),
    }));
}
