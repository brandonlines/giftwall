import { supabase } from "../../lib/supabase";

export type ScrapedProduct = {
  title: string | null;
  image: string | null;
  price_cents: number | null;
  currency: string | null;
};

export const scrapeRepo = {
  // Calls the scrape-link Edge Function. Best-effort: callers should fall back
  // to manual entry if this throws or returns empty fields.
  async fromUrl(url: string): Promise<ScrapedProduct> {
    const { data, error } = await supabase.functions.invoke<ScrapedProduct>(
      "scrape-link",
      { body: { url } },
    );
    if (error) throw error;
    return (
      data ?? { title: null, image: null, price_cents: null, currency: null }
    );
  },
};
