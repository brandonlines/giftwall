import { supabase, currentUserId } from "../../lib/supabase";
import type { Reservation } from "../../types/database";

// A reservation is a soft "I'm thinking about this" signal that sits below a
// hard claim — it never blocks anyone from claiming. Like claims, the Surprise
// Wall is enforced server-side by RLS (same can_see_claims_for_item predicate),
// so the recipient never sees reservations on their own list.
export const reservationsRepo = {
  async forItems(itemIds: string[]): Promise<Reservation[]> {
    if (itemIds.length === 0) return [];
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .in("item_id", itemIds);
    if (error) throw error;
    return data ?? [];
  },

  async reserve(itemId: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("reservations")
      .insert({ item_id: itemId, user_id: uid });
    // A duplicate just means we already hold it — treat as success.
    if (error && !/duplicate|unique/i.test(error.message)) throw error;
  },

  async release(itemId: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("item_id", itemId)
      .eq("user_id", uid);
    if (error) throw error;
  },
};
