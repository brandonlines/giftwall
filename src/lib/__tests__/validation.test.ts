import {
  parsePriceToCents,
  clampQuantity,
  isSafeHttpUrl,
  clampLen,
} from "../validation";

describe("parsePriceToCents", () => {
  it("parses decimals to cents", () => {
    expect(parsePriceToCents("29.99")).toBe(2999);
    expect(parsePriceToCents("18")).toBe(1800);
  });
  it("strips currency symbols/letters", () => {
    expect(parsePriceToCents("$ 5.50")).toBe(550);
  });
  it("returns null for empty/invalid/negative", () => {
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents("abc")).toBeNull();
    expect(parsePriceToCents("-3")).toBe(300); // '-' stripped → 3.00 (never negative)
  });
});

describe("clampQuantity", () => {
  it("floors to >= 1", () => {
    expect(clampQuantity("0")).toBe(1);
    expect(clampQuantity("-5")).toBe(1);
    expect(clampQuantity("")).toBe(1);
  });
  it("caps at 999 and floors decimals", () => {
    expect(clampQuantity("4")).toBe(4);
    expect(clampQuantity("2.9")).toBe(2);
    expect(clampQuantity(5000)).toBe(999);
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts http(s)", () => {
    expect(isSafeHttpUrl("https://example.com/p")).toBe(true);
    expect(isSafeHttpUrl("http://shop.test")).toBe(true);
  });
  it("rejects other schemes and garbage", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
  });
});

describe("clampLen", () => {
  it("trims and caps", () => {
    expect(clampLen("  hi  ", 10)).toBe("hi");
    expect(clampLen("abcdef", 3)).toBe("abc");
  });
});
