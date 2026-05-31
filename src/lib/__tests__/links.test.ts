import { inviteUrl, inviteMessage } from "../links";

// Make the custom-scheme fallback deterministic (no native module in jest).
jest.mock("expo-linking", () => ({
  createURL: (path: string) => `giftwall://${path}`,
}));

describe("inviteUrl", () => {
  const original = process.env.EXPO_PUBLIC_WEB_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_WEB_URL;
    else process.env.EXPO_PUBLIC_WEB_URL = original;
  });

  it("uses the custom scheme when no web URL is configured", () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    expect(inviteUrl("FROST24")).toBe("giftwall://join/FROST24");
  });

  it("builds an https link when a web URL is configured", () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://giftwall.app";
    expect(inviteUrl("FROST24")).toBe("https://giftwall.app/join/FROST24");
  });

  it("trims a trailing slash on the web URL so the path isn't doubled", () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://giftwall.app/";
    expect(inviteUrl("FROST24")).toBe("https://giftwall.app/join/FROST24");
  });
});

describe("inviteMessage", () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
  });

  it("includes the link and the manual-entry code", () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://giftwall.app";
    const msg = inviteMessage("The Frosts", "FROST24");
    expect(msg).toContain("The Frosts");
    expect(msg).toContain("https://giftwall.app/join/FROST24");
    expect(msg).toContain("enter code FROST24");
  });
});
