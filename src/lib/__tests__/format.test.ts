import { formatPrice, relativeTime } from "../format";

describe("formatPrice", () => {
  it("defaults to a $ prefix", () => {
    expect(formatPrice(12900, null)).toBe("$129.00");
  });
  it("uses the given currency", () => {
    expect(formatPrice(1850, "GBP")).toBe("GBP 18.50");
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
