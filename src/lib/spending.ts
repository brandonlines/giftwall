// Pure aggregation for the "what have I committed?" summary on the Shopping
// screen — no React / no backend, unit-tested. Claim prices are estimates (the
// item's listed price), chip-ins are exact amounts pledged.

export type SpendingTotals = {
  claimedCents: number; // sum of claimed gifts' listed prices
  chippedCents: number; // sum of your group-gift pledges
  totalCents: number;
  giftCount: number; // claims + chip-ins
};

export function spendingTotals(
  claimPrices: (number | null | undefined)[],
  chipInCents: number[],
): SpendingTotals {
  const claimedCents = claimPrices.reduce<number>((sum, p) => sum + (p ?? 0), 0);
  const chippedCents = chipInCents.reduce<number>((sum, c) => sum + c, 0);
  return {
    claimedCents,
    chippedCents,
    totalCents: claimedCents + chippedCents,
    giftCount: claimPrices.length + chipInCents.length,
  };
}
