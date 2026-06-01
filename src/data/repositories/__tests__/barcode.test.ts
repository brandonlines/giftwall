import { parseOpenFoodFacts } from "../barcode";

describe("parseOpenFoodFacts", () => {
  it("returns null when the product isn't found", () => {
    expect(parseOpenFoodFacts({ status: 0 })).toBeNull();
    expect(parseOpenFoodFacts({ status: 1 })).toBeNull();
    expect(parseOpenFoodFacts(null)).toBeNull();
  });

  it("prefixes the brand when the name omits it", () => {
    const r = parseOpenFoodFacts({
      status: 1,
      product: { product_name: "Hazelnut Spread", brands: "Nutella", image_front_url: "https://x/a.jpg" },
    });
    expect(r).toEqual({ title: "Nutella Hazelnut Spread", imageUrl: "https://x/a.jpg" });
  });

  it("doesn't double up when the name already includes the brand", () => {
    const r = parseOpenFoodFacts({
      status: 1,
      product: { product_name: "Nutella Hazelnut Spread", brands: "Nutella, Ferrero" },
    });
    expect(r?.title).toBe("Nutella Hazelnut Spread");
    expect(r?.imageUrl).toBeNull();
  });

  it("falls back to image_url / image_small_url and to brand-only names", () => {
    expect(
      parseOpenFoodFacts({ status: 1, product: { product_name: "Cola", image_url: "https://x/c.jpg" } }),
    ).toEqual({ title: "Cola", imageUrl: "https://x/c.jpg" });
    expect(
      parseOpenFoodFacts({ status: 1, product: { brands: "LEGO" } })?.title,
    ).toBe("LEGO");
  });
});
