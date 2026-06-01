// Barcode → product lookup using Open Food Facts — a free, open-source product
// database (no API key, ~3M+ products, strongest on groceries/health/beauty).
// expo-camera does the actual scanning; this turns the UPC/EAN number it reads
// into a real product name + image. Best-effort: returns null when the code
// isn't in the database (common for electronics/toys), and the caller falls
// back to manual entry.
//
// Broader retail coverage would need a keyed service (e.g. UPCitemdb); this
// parser is isolated so a second source can slot in behind it later.

const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";

export type BarcodeProduct = { title: string; imageUrl: string | null };

// Pure parser (no network) so it's unit-testable.
export function parseOpenFoodFacts(json: unknown): BarcodeProduct | null {
  const j = json as { status?: number; product?: Record<string, unknown> };
  if (!j || j.status !== 1 || !j.product) return null;
  const p = j.product;
  const name = typeof p.product_name === "string" ? p.product_name.trim() : "";
  const brand =
    typeof p.brands === "string" ? p.brands.split(",")[0]!.trim() : "";
  if (!name && !brand) return null;
  // Prefix the brand when the name doesn't already include it.
  const title =
    brand && name && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} ${name}`
      : name || brand;
  const img = p.image_front_url ?? p.image_url ?? p.image_small_url;
  return {
    title: title.slice(0, 120),
    imageUrl: typeof img === "string" && img ? img : null,
  };
}

export const barcodeRepo = {
  async lookup(barcode: string): Promise<BarcodeProduct | null> {
    const code = barcode.replace(/[^0-9]/g, "");
    if (code.length < 6) return null;
    try {
      const res = await fetch(
        `${OFF_BASE}/${code}.json?fields=product_name,brands,image_front_url,image_url,image_small_url`,
        { headers: { "User-Agent": "giftwall/1.0 (https://www.gift-well.ca)" } },
      );
      if (!res.ok) return null;
      return parseOpenFoodFacts(await res.json());
    } catch {
      return null;
    }
  },
};
