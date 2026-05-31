import {
  parsePriceToCents,
  clampQuantity,
  isSafeHttpUrl,
  clampLen,
  normalizeUsername,
  isValidUsername,
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

describe("normalizeUsername", () => {
  it("lowercases and collapses non-alphanumerics to underscores", () => {
    expect(normalizeUsername("Brandon Lines")).toBe("brandon_lines");
    expect(normalizeUsername("  J.D.  ")).toBe("j_d");
    expect(normalizeUsername("café-2025!")).toBe("caf_2025");
  });
  it("trims leading/trailing underscores and caps at 30 chars", () => {
    expect(normalizeUsername("__hi__")).toBe("hi");
    expect(normalizeUsername("a".repeat(40))).toHaveLength(30);
  });
  it("returns empty when nothing usable remains", () => {
    expect(normalizeUsername("!!!")).toBe("");
    expect(normalizeUsername("   ")).toBe("");
  });
});

describe("isValidUsername", () => {
  it("accepts 3–30 char lowercase handles", () => {
    expect(isValidUsername("brandon")).toBe(true);
    expect(isValidUsername("a_b_2")).toBe(true);
  });
  it("rejects too short, too long, or illegal characters", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(31))).toBe(false);
    expect(isValidUsername("Brandon")).toBe(false); // uppercase
    expect(isValidUsername("has space")).toBe(false);
    expect(isValidUsername("")).toBe(false);
  });
});
