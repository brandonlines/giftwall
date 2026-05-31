import { spendingTotals } from "../spending";

describe("spendingTotals", () => {
  it("sums claim prices and chip-ins, skipping null prices", () => {
    const t = spendingTotals([2500, null, 1000, undefined], [500, 1500]);
    expect(t.claimedCents).toBe(3500);
    expect(t.chippedCents).toBe(2000);
    expect(t.totalCents).toBe(5500);
    expect(t.giftCount).toBe(6); // 4 claims + 2 chip-ins
  });

  it("is all zeros when there's nothing", () => {
    const t = spendingTotals([], []);
    expect(t).toEqual({ claimedCents: 0, chippedCents: 0, totalCents: 0, giftCount: 0 });
  });

  it("handles claims with no prices", () => {
    const t = spendingTotals([null, null], []);
    expect(t.totalCents).toBe(0);
    expect(t.giftCount).toBe(2);
  });
});
