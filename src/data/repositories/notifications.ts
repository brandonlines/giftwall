import { supabase, currentUserId } from "../../lib/supabase";
import type { NotificationPrefs } from "../../types/database";

export type NotificationSettings = Pick<
  NotificationPrefs,
  "new_item" | "new_comment" | "occasion_reminder"
>;

export const notificationsRepo = {
  // A missing row means opted in to everything (the server default), so we
  // surface every category as ON when there's no row yet.
  async getMine(): Promise<NotificationSettings> {
    const uid = await currentUserId();
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("new_item, new_comment, occasion_reminder")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) throw error;
    return {
      new_item: data?.new_item ?? true,
      new_comment: data?.new_comment ?? true,
      occasion_reminder: data?.occasion_reminder ?? true,
    };
  },

  // Upsert: a new row gets the server defaults (true) for any column we don't
  // pass; an existing row only changes the columns we pass.
  async update(prefs: Partial<NotificationSettings>): Promise<void> {
    const uid = await currentUserId();
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: uid, ...prefs });
    if (error) throw error;
  },
};
