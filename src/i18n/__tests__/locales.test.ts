import { strings } from "../strings";

describe("locale catalogs", () => {
  const enKeys = Object.keys(strings.en).sort();
  const esKeys = Object.keys(strings.es).sort();

  it("es has exactly the same keys as en", () => {
    expect(esKeys).toEqual(enKeys);
  });

  it("no locale has empty strings", () => {
    for (const locale of Object.values(strings)) {
      for (const value of Object.values(locale)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
