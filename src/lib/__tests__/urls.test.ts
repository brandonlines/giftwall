import { splitUrls, firstUrl } from "../urls";

describe("splitUrls", () => {
  it("returns a single url", () => {
    expect(splitUrls("https://a.com/p")).toEqual(["https://a.com/p"]);
  });
  it("splits multiple urls on whitespace/newlines", () => {
    expect(splitUrls("https://a.com\nhttps://b.com  https://c.com")).toEqual([
      "https://a.com",
      "https://b.com",
      "https://c.com",
    ]);
  });
  it("keeps only valid http(s) urls, dropping junk", () => {
    expect(splitUrls("hello https://a.com world ftp://x not-a-url")).toEqual([
      "https://a.com",
    ]);
  });
  it("de-duplicates while preserving order", () => {
    expect(splitUrls("https://a.com https://b.com https://a.com")).toEqual([
      "https://a.com",
      "https://b.com",
    ]);
  });
  it("returns empty for empty/whitespace", () => {
    expect(splitUrls("")).toEqual([]);
    expect(splitUrls("   \n  ")).toEqual([]);
  });
});

describe("firstUrl", () => {
  it("pulls the link out of surrounding chatter", () => {
    expect(firstUrl("check this out https://a.com/p cool right")).toBe("https://a.com/p");
  });
  it("returns the first when several are present", () => {
    expect(firstUrl("https://a.com https://b.com")).toBe("https://a.com");
  });
  it("returns null when there's no valid url", () => {
    expect(firstUrl("just some text")).toBeNull();
    expect(firstUrl("")).toBeNull();
  });
});
