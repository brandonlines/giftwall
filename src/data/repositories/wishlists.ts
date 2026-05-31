import { decode } from "base64-arraybuffer";
import { supabase, currentUserId } from "../../lib/supabase";
import type { Item, Wishlist } from "../../types/database";
import { enqueue, isOfflineError, type OfflineItemFields } from "../offline/queue";

export const wishlistsRepo = {
  async get(listId: string): Promise<Wishlist> {
    const { data, error } = await supabase
      .from("wishlists")
      .select("*")
      .eq("id", listId)
      .single();
    if (error) throw error;
    return data;
  },

  async listForGroup(groupId: string): Promise<Wishlist[]> {
    const { data, error } = await supabase
      .from("wishlists")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(
    groupId: string,
    title: string,
    eventDate?: string | null,
    recursYearly = false,
  ): Promise<Wishlist> {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("wishlists")
      .insert({
        group_id: groupId,
        owner_id: uid,
        title,
        event_date: eventDate ?? null,
        recurs_yearly: recursYearly,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setOccasion(
    listId: string,
    eventDate: string | null,
    recursYearly: boolean,
  ): Promise<void> {
    const { error } = await supabase
      .from("wishlists")
      .update({ event_date: eventDate, recurs_yearly: recursYearly })
      .eq("id", listId);
    if (error) throw error;
  },

  // Post-occasion reveal: the list owner (giftee) opts in to seeing who gave
  // what. They still see only gifts whose giver has also opted in (two-party).
  async setRevealRequested(listId: string, revealed: boolean): Promise<void> {
    const { error } = await supabase
      .from("wishlists")
      .update({ reveal_requested: revealed })
      .eq("id", listId);
    if (error) throw error;
  },

  async getItem(itemId: string): Promise<Item> {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", itemId)
      .single();
    if (error) throw error;
    return data;
  },

  // Uploads a manually-chosen item photo to the user's folder in the
  // item-images bucket and returns its public URL (with a cache-buster).
  async uploadItemImage(base64: string, mimeType = "image/jpeg"): Promise<string> {
    const uid = await currentUserId();
    const ext = mimeType.split("/")[1] ?? "jpg";
    const path = `${uid}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("item-images")
      .upload(path, decode(base64), { contentType: mimeType, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("item-images").getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  },

  // Owner-only (enforced by RLS): delete a whole wishlist (cascades its items).
  async remove(listId: string): Promise<void> {
    const { error } = await supabase.from("wishlists").delete().eq("id", listId);
    if (error) throw error;
  },

  async items(listId: string): Promise<Item[]> {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("list_id", listId)
      .order("is_priority", { ascending: false }) // most-wanted first
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async addItem(
    listId: string,
    fields: Pick<Item, "title"> &
      Partial<
        Pick<
          Item,
          "url" | "image_url" | "images" | "price_cents" | "currency" | "note" | "quantity" | "is_priority" | "is_group_gift"
        >
      >,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("items")
        .insert({ list_id: listId, ...fields });
      if (error) throw error;
    } catch (err) {
      if (isOfflineError(err)) {
        await enqueue({ kind: "item.create", listId, fields: fields as OfflineItemFields });
        return; // will sync when back online
      }
      throw err;
    }
  },

  async updateItem(
    itemId: string,
    fields: Partial<
      Pick<
        Item,
        | "title"
        | "url"
        | "image_url"
        | "images"
        | "price_cents"
        | "currency"
        | "note"
        | "quantity"
        | "is_priority"
        | "is_group_gift"
      >
    >,
  ): Promise<void> {
    const { error } = await supabase.from("items").update(fields).eq("id", itemId);
    if (error) throw error;
  },

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase.from("items").delete().eq("id", itemId);
    if (error) throw error;
  },
};
