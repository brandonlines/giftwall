import { t } from "../index";
import type { StringKey } from "../strings";

describe("t()", () => {
  it("returns the catalog string for a key", () => {
    expect(t("groups.create")).toBe("Create");
  });
  it("interpolates {vars}", () => {
    expect(t("signin.codeHint", { email: "a@b.com" })).toContain("a@b.com");
  });
  it("falls back to the key itself when missing", () => {
    expect(t("nope.missing" as StringKey)).toBe("nope.missing");
  });
});
