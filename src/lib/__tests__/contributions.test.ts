import { sumCents, fundedFraction, myContribution } from "../contributions";
import type { Contribution } from "../../types/database";

const c = (contributor_id: string, amount_cents: number): Contribution => ({
  id: `${contributor_id}-${amount_cents}`,
  item_id: "i1",
  contributor_id,
  amount_cents,
  note: null,
  created_at: "2026-01-01T00:00:00Z",
});

describe("sumCents", () => {
  it("adds up contributions", () => {
    expect(sumCents([c("a", 1000), c("b", 2500)])).toBe(3500);
  });
  it("is 0 for none", () => {
    expect(sumCents([])).toBe(0);
  });
});

describe("fundedFraction", () => {
  it("is the ratio toward the target, capped at 1", () => {
    expect(fundedFraction([c("a", 2500)], 5000)).toBe(0.5);
    expect(fundedFraction([c("a", 6000)], 5000)).toBe(1);
  });
  it("is 0 with no or invalid target", () => {
    expect(fundedFraction([c("a", 2500)], null)).toBe(0);
    expect(fundedFraction([c("a", 2500)], 0)).toBe(0);
  });
});

describe("myContribution", () => {
  it("finds the current user's row (or nothing)", () => {
    const rows = [c("a", 1000), c("b", 2000)];
    expect(myContribution(rows, "b")?.amount_cents).toBe(2000);
    expect(myContribution(rows, "z")).toBeUndefined();
    expect(myContribution(rows, undefined)).toBeUndefined();
  });
});
