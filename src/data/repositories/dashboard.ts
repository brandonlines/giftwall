import { supabase, currentUserId } from "../../lib/supabase";
import type { Wishlist } from "../../types/database";
import { daysUntil, nextOccurrence } from "../../lib/dates";

export type UpcomingOccasion = {
  wishlist: Wishlist;
  groupName: string | null;
  daysUntil: number; // to the next occurrence (recurring dates roll forward)
  isMine: boolean; // the current user owns this list
  unclaimed: number; // gifts still up for grabs (0 for your own list — Surprise Wall)
};

// How far ahead the home dashboard looks, and how many occasions it surfaces.
const WINDOW_DAYS = 60;
const MAX = 6;

// Aggregates the "what needs me soon" view across every group the user belongs
// to. RLS scopes all of these queries to the user's groups, and — crucially —
// returns NO claims for the user's own lists, so the unclaimed count we show for
// our own occasions is always 0 (we surface only the countdown there). For other
// people's lists the count is real, nudging the user to claim before the date.
export const dashboardRepo = {
  async upcoming(now: number = Date.now()): Promise<UpcomingOccasion[]> {
    const uid = await currentUserId();

    const { data: lists, error } = await supabase
      .from("wishlists")
      .select("*")
      .not("event_date", "is", null);
    if (error) throw error;

    const soon = (lists ?? [])
      .map((w) => ({ w, d: daysUntil(nextOccurrence(w.event_date!, w.recurs_yearly, now), now) }))
      .filter((x) => Number.isFinite(x.d) && x.d >= 0 && x.d <= WINDOW_DAYS)
      .sort((a, b) => a.d - b.d)
      .slice(0, MAX);
    if (soon.length === 0) return [];

    const groupIds = [...new Set(soon.map((x) => x.w.group_id))];
    const { data: groups, error: gErr } = await supabase
      .from("groups")
      .select("id, name")
      .in("id", groupIds);
    if (gErr) throw gErr;
    const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));

    // Unclaimed counts only for lists the user does NOT own (the recipient sees
    // no claims anyway, by RLS — counting them would be meaningless and unsafe).
    const otherListIds = soon.filter((x) => x.w.owner_id !== uid).map((x) => x.w.id);
    const unclaimedByList = new Map<string, number>();
    if (otherListIds.length > 0) {
      const { data: items, error: iErr } = await supabase
        .from("items")
        .select("id, list_id, quantity, is_group_gift")
        .in("list_id", otherListIds);
      if (iErr) throw iErr;
      const itemIds = (items ?? []).map((i) => i.id);

      const claimCount = new Map<string, number>();
      if (itemIds.length > 0) {
        const { data: claims, error: cErr } = await supabase
          .from("claims")
          .select("item_id")
          .in("item_id", itemIds);
        if (cErr) throw cErr;
        for (const c of claims ?? []) {
          claimCount.set(c.item_id, (claimCount.get(c.item_id) ?? 0) + 1);
        }
      }

      for (const it of items ?? []) {
        if (it.is_group_gift) continue; // group gifts use pooled funding, not claims
        if ((claimCount.get(it.id) ?? 0) < it.quantity) {
          unclaimedByList.set(it.list_id, (unclaimedByList.get(it.list_id) ?? 0) + 1);
        }
      }
    }

    return soon.map((x) => ({
      wishlist: x.w,
      groupName: groupName.get(x.w.group_id) ?? null,
      daysUntil: x.d,
      isMine: x.w.owner_id === uid,
      unclaimed: unclaimedByList.get(x.w.id) ?? 0,
    }));
  },
};
