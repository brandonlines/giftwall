import { supabase, currentUserId } from "../../lib/supabase";
import type { ThankYou } from "../../types/database";

export type ReceivedThanks = {
  itemId: string;
  message: string;
  createdAt: string;
  itemTitle: string;
  fromName: string;
};

export const thanksRepo = {
  // Recipient → giver. Upsert so re-thanking edits the note.
  async send(itemId: string, toId: string, message: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase.from("thank_yous").upsert(
      { item_id: itemId, from_id: uid, to_id: toId, message },
      { onConflict: "item_id,from_id,to_id" },
    );
    if (error) throw error;
  },

  // The thanks the current user has already sent for these items — used to show
  // a "thanked ✓" state on the reveal screen.
  async sentForItems(itemIds: string[]): Promise<ThankYou[]> {
    if (itemIds.length === 0) return [];
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("thank_yous")
      .select("*")
      .in("item_id", itemIds)
      .eq("from_id", uid);
    if (error) throw error;
    return data ?? [];
  },

  // The giver's inbox — thanks addressed to me, enriched with the item title and
  // sender's name (both readable: I share the item's group and the sender's
  // group). memberships/profiles don't FK to thank_yous, so we merge by hand.
  async received(): Promise<ReceivedThanks[]> {
    const uid = await currentUserId();
    const { data: rows, error } = await supabase
      .from("thank_yous")
      .select("*")
      .eq("to_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const itemIds = [...new Set(rows.map((r) => r.item_id))];
    const fromIds = [...new Set(rows.map((r) => r.from_id))];
    const [items, profiles] = await Promise.all([
      supabase.from("items").select("id, title").in("id", itemIds),
      supabase.from("profiles").select("id, display_name").in("id", fromIds),
    ]);
    const titleOf = new Map((items.data ?? []).map((i) => [i.id, i.title]));
    const nameOf = new Map((profiles.data ?? []).map((p) => [p.id, p.display_name]));
    return rows.map((r) => ({
      itemId: r.item_id,
      message: r.message,
      createdAt: r.created_at,
      itemTitle: titleOf.get(r.item_id) ?? "a gift",
      fromName: nameOf.get(r.from_id) ?? "Someone",
    }));
  },
};
