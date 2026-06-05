import { supabase, currentUserId } from "../../lib/supabase";

export type BlockedUser = {
  user_id: string;
  displayName: string | null;
  avatarUrl: string | null;
};

// Blocking is symmetric and enforced in the database (RLS): once you block
// someone, neither of you sees the other's comments or group messages. This repo
// just manages your own block list — the hiding happens server-side.
export const blocksRepo = {
  async block(userId: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: uid, blocked_id: userId });
    // Ignore a duplicate (already blocked).
    if (error && error.code !== "23505") throw error;
  },

  async unblock(userId: string): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", uid)
      .eq("blocked_id", userId);
    if (error) throw error;
  },

  // Your block list, with display names where readable.
  async listMine(): Promise<BlockedUser[]> {
    const { data, error } = await supabase
      .from("blocks")
      .select("blocked_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const ids = (data ?? []).map((b) => b.blocked_id);
    if (ids.length === 0) return [];

    // Profiles may not be readable if you no longer share a group — fall back to
    // a placeholder so the row is still unblockable.
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return ids.map((id) => ({
      user_id: id,
      displayName: byId.get(id)?.display_name ?? null,
      avatarUrl: byId.get(id)?.avatar_url ?? null,
    }));
  },
};
