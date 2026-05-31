import { supabase, currentUserId } from "../../lib/supabase";
import type { Contribution } from "../../types/database";

// Group gifting ("chip in"). Like claims, the Surprise Wall is enforced
// server-side by RLS — a list owner reading contributions on their own item
// gets an empty set by policy, never by a client-side filter.
export const contributionsRepo = {
  async forItems(itemIds: string[]): Promise<Contribution[]> {
    if (itemIds.length === 0) return [];
    const { data, error } = await supabase
      .from("contributions")
      .select("*")
      .in("item_id", itemIds);
    if (error) throw error;
    return data ?? [];
  },

  // Pledge (or update your existing pledge) on an item.
  async chipIn(itemId: string, amountCents: number, note?: string | null): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase.from("contributions").upsert(
      { item_id: itemId, contributor_id: uid, amount_cents: amountCents, note: note ?? null },
      { onConflict: "item_id,contributor_id" },
    );
    if (error) throw error;
  },

  async remove(itemId: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("contributions")
      .delete()
      .eq("item_id", itemId)
      .eq("contributor_id", uid);
    if (error) throw error;
  },
};
