import { supabase } from "../../lib/supabase";
import type { Activity } from "../../types/database";

export type ActivityEntry = Activity & { actorName: string };

export const activityRepo = {
  // Recent group activity (newest first), paginated with a created_at cursor.
  // RLS limits this to the caller's groups, and the feed never includes claims
  // — so it's Surprise-Wall-safe.
  async listForGroup(
    groupId: string,
    opts: { limit?: number; before?: string } = {},
  ): Promise<ActivityEntry[]> {
    let query = supabase
      .from("activity")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 30);
    if (opts.before) query = query.lt("created_at", opts.before);
    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) return [];

    const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", actorIds);
    const nameById = new Map(profiles?.map((p) => [p.id, p.display_name ?? "Someone"]));

    return rows.map((r) => ({
      ...r,
      actorName: (r.actor_id && nameById.get(r.actor_id)) || "Someone",
    }));
  },
};
