import { supabase, currentUserId } from "../../lib/supabase";
import type { SantaAssignment, SantaExclusion } from "../../types/database";

// Exclusions are symmetric (a couple, in either direction), so we store one row
// per pair in a canonical order — sort the two ids — to dedupe and to delete
// deterministically. The draw checks both directions regardless.
function orderedPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

// Secret Santa. The draw runs server-side (SECURITY DEFINER) so nobody — not even
// the admin who triggers it — learns the full mapping. Members read only their
// own assignment via RLS.
export const santaRepo = {
  async draw(groupId: string): Promise<void> {
    const { error } = await supabase.rpc("draw_secret_santa", { p_group_id: groupId });
    if (error) throw error;
  },

  // Who YOU are buying for (or null if not drawn / you're not in the draw).
  async myAssignment(groupId: string): Promise<SantaAssignment | null> {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("santa_assignments")
      .select("*")
      .eq("group_id", groupId)
      .eq("giver_id", uid)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async isDrawn(groupId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("santa_is_drawn", { p_group_id: groupId });
    if (error) throw error;
    return !!data;
  },

  // --- Exclusions (admin-only via RLS) -------------------------------------
  async listExclusions(groupId: string): Promise<SantaExclusion[]> {
    const { data, error } = await supabase
      .from("santa_exclusions")
      .select("*")
      .eq("group_id", groupId);
    if (error) throw error;
    return data ?? [];
  },

  async addExclusion(groupId: string, userX: string, userY: string): Promise<void> {
    const [user_a, user_b] = orderedPair(userX, userY);
    const { error } = await supabase
      .from("santa_exclusions")
      .insert({ group_id: groupId, user_a, user_b });
    if (error) throw error;
  },

  async removeExclusion(groupId: string, userX: string, userY: string): Promise<void> {
    const [user_a, user_b] = orderedPair(userX, userY);
    const { error } = await supabase
      .from("santa_exclusions")
      .delete()
      .eq("group_id", groupId)
      .eq("user_a", user_a)
      .eq("user_b", user_b);
    if (error) throw error;
  },
};
