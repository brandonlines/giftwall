import { supabase, currentUserId } from "../../lib/supabase";
import { flush } from "./queue";

// Replays every queued offline mutation once a session exists / connectivity
// returns. Called on auth changes. Each handler is idempotent enough to drop a
// mutation that's no longer applicable (e.g. someone else claimed first).
export async function syncOfflineMutations(): Promise<void> {
  let uid: string;
  try {
    uid = await currentUserId();
  } catch {
    return;
  }

  await flush({
    "claim.create": async (m) => {
      const { error } = await supabase
        .from("claims")
        .insert({ item_id: m.itemId, buyer_id: uid });
      // Unique violation / full item → someone beat us to it; drop quietly.
      if (error && !/duplicate|unique|fully claimed/i.test(error.message)) throw error;
    },
    "claim.release": async (m) => {
      const { error } = await supabase
        .from("claims")
        .delete()
        .eq("item_id", m.itemId)
        .eq("buyer_id", uid);
      if (error) throw error;
    },
    "comment.create": async (m) => {
      const { error } = await supabase
        .from("item_comments")
        .insert({ item_id: m.itemId, author_id: uid, body: m.body });
      if (error) throw error;
    },
    "item.create": async (m) => {
      const { error } = await supabase
        .from("items")
        .insert({ list_id: m.listId, ...m.fields });
      if (error) throw error;
    },
  });
}
