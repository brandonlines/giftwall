import { supabase, currentUserId } from "../../lib/supabase";

export type ReportContentType = "comment" | "message" | "item" | "profile";

// Flag user-generated content for operator review. The reports table is
// write-only for members (RLS) — only the operator reads it via the service role.
export const reportsRepo = {
  async report(
    contentType: ReportContentType,
    contentId: string,
    opts: { groupId?: string | null; reason?: string | null } = {},
  ): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase.from("reports").insert({
      reporter_id: uid,
      content_type: contentType,
      content_id: contentId,
      group_id: opts.groupId ?? null,
      reason: opts.reason ?? null,
    });
    if (error) throw error;
  },
};
