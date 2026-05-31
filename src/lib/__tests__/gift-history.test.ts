import { groupByYear, type GiftRecord } from "../gift-history";

const rec = (id: string, when: string): GiftRecord => ({
  id,
  title: `Gift ${id}`,
  personName: "Sam",
  when,
  priceCents: null,
  kind: "gift",
});

describe("groupByYear", () => {
  it("buckets by year, newest year first", () => {
    const groups = groupByYear([
      rec("a", "2024-06-01T00:00:00Z"),
      rec("b", "2025-01-10T00:00:00Z"),
      rec("c", "2024-12-31T00:00:00Z"),
    ]);
    expect(groups.map((g) => g.year)).toEqual(["2025", "2024"]);
    expect(groups[1].records.map((r) => r.id)).toEqual(["c", "a"]); // newest first within 2024
  });

  it("returns an empty array for no records", () => {
    expect(groupByYear([])).toEqual([]);
  });

  it("buckets malformed timestamps under a placeholder year", () => {
    const groups = groupByYear([rec("x", "not-a-date")]);
    expect(groups[0].year).toBe("—");
  });
});
