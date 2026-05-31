import type { Contribution } from "../types/database";

// Pure helpers for group-gift ("chip in") math — no React, no backend, unit-tested.

export function sumCents(rows: Contribution[]): number {
  return rows.reduce((t, c) => t + (c.amount_cents > 0 ? c.amount_cents : 0), 0);
}

// Progress (0..1) toward a target price. 0 when there's no/invalid target.
export function fundedFraction(rows: Contribution[], targetCents: number | null): number {
  if (!targetCents || targetCents <= 0) return 0;
  return Math.min(1, sumCents(rows) / targetCents);
}

export function myContribution(
  rows: Contribution[],
  userId: string | undefined,
): Contribution | undefined {
  return userId ? rows.find((c) => c.contributor_id === userId) : undefined;
}
