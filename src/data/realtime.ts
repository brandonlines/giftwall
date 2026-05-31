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

// Live reactions for one item (group-visible, recipient included).
export function subscribeToReactions(itemId: string, onChange: () => void) {
  const channel = supabase
    .channel(`reactions-${itemId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reactions", filter: `item_id=eq.${itemId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Live reservations (soft interest). RLS-enforced exactly like claims, so the
// recipient never receives reservation events for their own list.
export function subscribeToReservations(onChange: () => void) {
  const channel = supabase
    .channel("reservations-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reservations" },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Live group-gift contributions for one item. RLS-enforced — the recipient
// never receives events for their own item, so the Surprise Wall holds.
export function subscribeToContributions(itemId: string, onChange: () => void) {
  const channel = supabase
    .channel(`contributions-${itemId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "contributions", filter: `item_id=eq.${itemId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Live Secret Santa draw for one group. RLS means a member only receives their
// OWN assignment row — so "you're buying for ___" appears right after the draw
// without leaking anyone else's match over the wire.
export function subscribeToSanta(groupId: string, onChange: () => void) {
  const channel = supabase
    .channel(`santa-${groupId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "santa_assignments", filter: `group_id=eq.${groupId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Live group chat for one group. Gated by RLS on membership, so every member
// (recipient included) sees new messages as they land — it's general coordination.
export function subscribeToGroupMessages(groupId: string, onChange: () => void) {
  const channel = supabase
    .channel(`group-messages-${groupId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
