import { affiliateUrl, isAffiliable } from "../affiliate";

const TAG = "giftwall-20";

describe("affiliateUrl", () => {
  it("adds the tag to Amazon product URLs", () => {
    expect(affiliateUrl("https://www.amazon.com/dp/B0ABC", TAG)).toBe(
      "https://www.amazon.com/dp/B0ABC?tag=giftwall-20",
    );
  });

  it("works across Amazon locales and preserves existing query params", () => {
    expect(affiliateUrl("https://www.amazon.ca/dp/X?th=1", TAG)).toBe(
      "https://www.amazon.ca/dp/X?th=1&tag=giftwall-20",
    );
    expect(affiliateUrl("https://www.amazon.co.uk/dp/Y", TAG)).toContain("tag=giftwall-20");
  });

  it("overwrites a foreign tag with ours", () => {
    expect(affiliateUrl("https://amazon.com/dp/Z?tag=someoneelse-20", TAG)).toBe(
      "https://amazon.com/dp/Z?tag=giftwall-20",
    );
  });

  it("leaves non-Amazon URLs untouched", () => {
    const etsy = "https://www.etsy.com/listing/123/thing";
    expect(affiliateUrl(etsy, TAG)).toBe(etsy);
  });

  it("returns input unchanged when no tag is configured", () => {
    expect(affiliateUrl("https://www.amazon.com/dp/B0ABC", "")).toBe(
      "https://www.amazon.com/dp/B0ABC",
    );
  });

  it("never throws on invalid or non-http input", () => {
    expect(affiliateUrl("not a url", TAG)).toBe("not a url");
    expect(affiliateUrl("javascript:alert(1)", TAG)).toBe("javascript:alert(1)");
    expect(affiliateUrl("", TAG)).toBe("");
  });

  it("does not match lookalike hosts", () => {
    const phish = "https://amazon.com.evil.test/dp/X";
    expect(affiliateUrl(phish, TAG)).toBe(phish);
  });
});

describe("isAffiliable", () => {
  it("recognizes Amazon hosts only", () => {
    expect(isAffiliable("https://www.amazon.de/dp/X")).toBe(true);
    expect(isAffiliable("https://example.com")).toBe(false);
    expect(isAffiliable("garbage")).toBe(false);
  });
});
