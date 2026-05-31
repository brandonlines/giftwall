import { formatPrice, relativeTime } from "../format";

describe("formatPrice", () => {
  it("defaults to a $ prefix", () => {
    expect(formatPrice(12900, null)).toBe("$129.00");
  });
  it("maps known currency codes to their symbol", () => {
    expect(formatPrice(1850, "GBP")).toBe("£18.50");
    expect(formatPrice(50000, "EUR")).toBe("€500.00");
    expect(formatPrice(2500, "JPY")).toBe("¥25.00");
    expect(formatPrice(1850, "cad")).toBe("$18.50"); // case-insensitive
  });
  it("falls back to a CODE prefix for unknown currencies", () => {
    expect(formatPrice(1850, "XYZ")).toBe("XYZ 18.50");
  });
  it("groups thousands", () => {
    expect(formatPrice(129900, null)).toBe("$1,299.00");
    expect(formatPrice(123456789, "EUR")).toBe("€1,234,567.89");
  });
  it("keeps two decimals", () => {
    expect(formatPrice(999, null)).toBe("$9.99");
    expect(formatPrice(0, null)).toBe("$0.00");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-05-29T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("shows 'just now' under a minute", () => {
    expect(relativeTime(ago(30_000), now)).toBe("just now");
  });
  it("shows minutes", () => {
    expect(relativeTime(ago(5 * 60_000), now)).toBe("5m ago");
  });
  it("shows hours", () => {
    expect(relativeTime(ago(3 * 3_600_000), now)).toBe("3h ago");
  });
  it("shows days under a week", () => {
    expect(relativeTime(ago(2 * 86_400_000), now)).toBe("2d ago");
  });
});
