import { supabase, currentUserId } from "../../lib/supabase";
import type { ItemComment } from "../../types/database";
import { enqueue, isOfflineError } from "../offline/queue";
import { clampLen, LIMITS } from "../../lib/validation";

export type CommentEntry = ItemComment & { authorName: string; isMine: boolean };

export const commentsRepo = {
  // Comments visible to the caller. RLS blocks the recipient entirely, so this
  // is safe to call from any item the user can discuss.
  async listForItem(itemId: string): Promise<CommentEntry[]> {
    const uid = await currentUserId().catch(() => null);
    const { data: rows, error } = await supabase
      .from("item_comments")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const ids = [...new Set(rows.map((r) => r.author_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    const nameById = new Map(profiles?.map((p) => [p.id, p.display_name ?? "Someone"]));

    return rows.map((r) => ({
      ...r,
      authorName: nameById.get(r.author_id) ?? "Someone",
      isMine: r.author_id === uid,
    }));
  },

  async add(itemId: string, body: string): Promise<void> {
    const uid = await currentUserId();
    const trimmed = clampLen(body, LIMITS.comment);
    if (!trimmed) return;
    try {
      const { error } = await supabase
        .from("item_comments")
        .insert({ item_id: itemId, author_id: uid, body: trimmed });
      if (error) throw error;
    } catch (err) {
      if (isOfflineError(err)) {
        await enqueue({ kind: "comment.create", itemId, body: trimmed });
        return; // will sync when back online
      }
      throw err;
    }
  },

  async remove(commentId: string): Promise<void> {
    const { error } = await supabase
      .from("item_comments")
      .delete()
      .eq("id", commentId);
    if (error) throw error;
  },
};
