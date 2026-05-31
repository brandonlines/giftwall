import { supabase, currentUserId } from "../../lib/supabase";
import type { GroupMessage } from "../../types/database";
import { clampLen, LIMITS } from "../../lib/validation";

export type MessageEntry = GroupMessage & { authorName: string; isMine: boolean };

// Group-wide chat. RLS gates on membership (not the Surprise Wall), so any member
// reads/posts; the recipient sees it too — it's general coordination.
export const messagesRepo = {
  async listForGroup(groupId: string): Promise<MessageEntry[]> {
    const uid = await currentUserId().catch(() => null);
    const { data: rows, error } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
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

  async post(groupId: string, body: string): Promise<void> {
    const uid = await currentUserId();
    const trimmed = clampLen(body, LIMITS.comment);
    if (!trimmed) return;
    const { error } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, author_id: uid, body: trimmed });
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("group_messages").delete().eq("id", id);
    if (error) throw error;
  },
};
