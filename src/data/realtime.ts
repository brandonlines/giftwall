import { supabase } from "../lib/supabase";
import type { Claim } from "../types/database";

// Subscribe to claim changes via Postgres Changes. RLS is enforced on this
// feed, so a list owner subscribed to their own list simply never receives
// claim events — the Surprise Wall holds even over realtime.
//
// IMPORTANT: do not move claim payloads onto Realtime "Broadcast"; that channel
// does not apply RLS and would leak surprises to the recipient.
export function subscribeToClaims(
  onChange: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    claim: Claim | null;
  }) => void,
) {
  const channel = supabase
    .channel("claims-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "claims" },
      (payload) => {
        onChange({
          eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          claim: (payload.new ?? payload.old ?? null) as Claim | null,
        });
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Live comment changes for one item. RLS-enforced, so a recipient subscribed to
// their own item receives nothing. The callback just signals "something
// changed"; the screen refetches the visible rows.
export function subscribeToComments(itemId: string, onChange: () => void) {
  const channel = supabase
    .channel(`comments-${itemId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "item_comments", filter: `item_id=eq.${itemId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Live activity for one group.
export function subscribeToActivity(groupId: string, onChange: () => void) {
  const channel = supabase
    .channel(`activity-${groupId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "activity", filter: `group_id=eq.${groupId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
