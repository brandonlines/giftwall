import { supabase, currentUserId } from "../../lib/supabase";
import type { Reaction } from "../../types/database";

// Reactions are public to the group (not Surprise-Wall secret) — RLS only checks
// group membership, so the recipient sees them too.
export const reactionsRepo = {
  async forItems(itemIds: string[]): Promise<Reaction[]> {
    if (itemIds.length === 0) return [];
    const { data, error } = await supabase
      .from("reactions")
      .select("*")
      .in("item_id", itemIds);
    if (error) throw error;
    return data ?? [];
  },

  async add(itemId: string, emoji: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("reactions")
      .insert({ item_id: itemId, user_id: uid, emoji });
    if (error) throw error;
  },

  async remove(itemId: string, emoji: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("item_id", itemId)
      .eq("user_id", uid)
      .eq("emoji", emoji);
    if (error) throw error;
  },
};
