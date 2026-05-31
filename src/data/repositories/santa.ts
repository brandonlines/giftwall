import { supabase, currentUserId } from "../../lib/supabase";
import type { SantaAssignment } from "../../types/database";

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
};
