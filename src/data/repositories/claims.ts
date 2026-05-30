import { supabase, currentUserId } from "../../lib/supabase";
import type { Claim } from "../../types/database";
import { enqueue, isOfflineError } from "../offline/queue";

// The Surprise Wall is enforced server-side by RLS, so reads here simply trust
// the database to return only rows the user is allowed to see. A list owner
// querying claims on their own list gets an empty set — by policy, not by a
// client-side filter that a bug could defeat.

export const claimsRepo = {
  // Claims the current user can see for a set of items (used to grey out buttons).
  async forItems(itemIds: string[]): Promise<Claim[]> {
    if (itemIds.length === 0) return [];
    const { data, error } = await supabase
      .from("claims")
      .select("*")
      .in("item_id", itemIds);
    if (error) throw error;
    return data ?? [];
  },

  async claim(itemId: string): Promise<void> {
    const uid = await currentUserId();
    const clientId = `${itemId}:${uid}`;
    try {
      const { error } = await supabase
        .from("claims")
        .insert({ item_id: itemId, buyer_id: uid });
      if (error) throw error;
    } catch (err) {
      if (isOfflineError(err)) {
        await enqueue({ kind: "claim.create", itemId, clientId });
        return; // UI already updated optimistically; sync will reconcile.
      }
      throw err;
    }
  },

  async release(itemId: string): Promise<void> {
    const uid = await currentUserId();
    const clientId = `${itemId}:${uid}`;
    try {
      const { error } = await supabase
        .from("claims")
        .delete()
        .eq("item_id", itemId)
        .eq("buyer_id", uid);
      if (error) throw error;
    } catch (err) {
      if (isOfflineError(err)) {
        await enqueue({ kind: "claim.release", itemId, clientId });
        return;
      }
      throw err;
    }
  },

  // Buyer flips their own claim between "claimed" and "purchased".
  async setPurchased(itemId: string, purchased: boolean): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("claims")
      .update({ status: purchased ? "purchased" : "claimed" })
      .eq("item_id", itemId)
      .eq("buyer_id", uid);
    if (error) throw error;
  },
};
