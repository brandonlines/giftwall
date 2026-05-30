import { supabase, currentUserId } from "../../lib/supabase";
import type { ClaimStatus } from "../../types/database";

// One thing the caller has agreed to buy. This is the buyer's OWN view (their
// claims), which RLS always allows — it never exposes anyone else's claims, so
// the Surprise Wall is unaffected.
export type ShoppingEntry = {
  claimId: string;
  itemId: string;
  status: ClaimStatus;
  title: string;
  priceCents: number | null;
  currency: string | null;
  listTitle: string;
  groupName: string;
};

export const shoppingRepo = {
  // Everything the signed-in user has claimed, across every group, newest first.
  // Batched fetches (claims → items → wishlists → groups) keep it simple and
  // avoid relying on PostgREST embed typing.
  async mine(): Promise<ShoppingEntry[]> {
    const uid = await currentUserId();

    const { data: claims, error } = await supabase
      .from("claims")
      .select("*")
      .eq("buyer_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!claims || claims.length === 0) return [];

    const itemIds = [...new Set(claims.map((c) => c.item_id))];
    const { data: items } = await supabase
      .from("items")
      .select("id, list_id, title, price_cents, currency")
      .in("id", itemIds);
    const itemById = new Map((items ?? []).map((i) => [i.id, i]));

    const listIds = [...new Set((items ?? []).map((i) => i.list_id))];
    const { data: lists } = await supabase
      .from("wishlists")
      .select("id, title, group_id")
      .in("id", listIds);
    const listById = new Map((lists ?? []).map((l) => [l.id, l]));

    const groupIds = [...new Set((lists ?? []).map((l) => l.group_id))];
    const { data: groups } = await supabase
      .from("groups")
      .select("id, name")
      .in("id", groupIds);
    const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]));

    return claims.map((c) => {
      const item = itemById.get(c.item_id);
      const list = item ? listById.get(item.list_id) : undefined;
      return {
        claimId: c.id,
        itemId: c.item_id,
        status: c.status,
        title: item?.title ?? "Item",
        priceCents: item?.price_cents ?? null,
        currency: item?.currency ?? null,
        listTitle: list?.title ?? "List",
        groupName: (list && groupNameById.get(list.group_id)) ?? "Group",
      };
    });
  },
};
