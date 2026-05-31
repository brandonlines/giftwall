import { supabase, currentUserId } from "../../lib/supabase";
import type { GiftRecord } from "../../lib/gift-history";

export type GiftHistory = { given: GiftRecord[]; received: GiftRecord[] };

async function namesByIds(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p.display_name ?? "Someone"]));
}

// Assembles a per-user gift timeline from existing data:
//   • GIVEN     — the user's own claims + chip-ins. RLS always allows reading
//                 your own, and a buyer knowing what they gave is not a Surprise
//                 Wall concern (the wall hides claims from the *recipient*).
//   • RECEIVED  — claims/contributions on the user's OWN items, but ONLY the
//                 revealed ones. The two-party post-occasion reveal RLS is the
//                 gate; the extra `.eq("revealed", true)` is belt-and-suspenders.
//                 Unrevealed gifts never appear, so the wall is preserved.
export const giftHistoryRepo = {
  async mine(): Promise<GiftHistory> {
    const uid = await currentUserId();

    // GIVEN
    const [{ data: myClaims }, { data: myContribs }] = await Promise.all([
      supabase.from("claims").select("id, item_id, created_at").eq("buyer_id", uid),
      supabase
        .from("contributions")
        .select("id, item_id, amount_cents, created_at")
        .eq("contributor_id", uid),
    ]);
    const givenClaims = myClaims ?? [];
    const givenContribs = myContribs ?? [];

    // RECEIVED — find my items, then the revealed gifts on them.
    const { data: myLists } = await supabase.from("wishlists").select("id").eq("owner_id", uid);
    const myListIds = (myLists ?? []).map((l) => l.id);
    let myItemIds: string[] = [];
    if (myListIds.length > 0) {
      const { data: myItems } = await supabase.from("items").select("id").in("list_id", myListIds);
      myItemIds = (myItems ?? []).map((i) => i.id);
    }
    let recvClaims: { id: string; item_id: string; buyer_id: string; created_at: string }[] = [];
    let recvContribs: {
      id: string;
      item_id: string;
      contributor_id: string;
      amount_cents: number;
      created_at: string;
    }[] = [];
    if (myItemIds.length > 0) {
      const [{ data: rc }, { data: rk }] = await Promise.all([
        supabase
          .from("claims")
          .select("id, item_id, buyer_id, created_at")
          .in("item_id", myItemIds)
          .eq("revealed", true),
        supabase
          .from("contributions")
          .select("id, item_id, contributor_id, amount_cents, created_at")
          .in("item_id", myItemIds)
          .eq("revealed", true),
      ]);
      recvClaims = rc ?? [];
      recvContribs = rk ?? [];
    }

    // Resolve item titles/prices and each item's list owner (the recipient).
    const allItemIds = [
      ...givenClaims.map((c) => c.item_id),
      ...givenContribs.map((c) => c.item_id),
      ...recvClaims.map((c) => c.item_id),
      ...recvContribs.map((c) => c.item_id),
    ];
    const itemMap = new Map<string, { title: string; price_cents: number | null; list_id: string }>();
    const ownerByList = new Map<string, string>();
    const uniqueItemIds = [...new Set(allItemIds)];
    if (uniqueItemIds.length > 0) {
      const { data: items } = await supabase
        .from("items")
        .select("id, title, price_cents, list_id")
        .in("id", uniqueItemIds);
      for (const it of items ?? []) itemMap.set(it.id, it);
      const listIds = [...new Set((items ?? []).map((i) => i.list_id))];
      if (listIds.length > 0) {
        const { data: lists } = await supabase.from("wishlists").select("id, owner_id").in("id", listIds);
        for (const l of lists ?? []) ownerByList.set(l.id, l.owner_id);
      }
    }

    const recipientOf = (itemId: string): string | undefined => {
      const it = itemMap.get(itemId);
      return it ? ownerByList.get(it.list_id) : undefined;
    };

    const names = await namesByIds([
      ...givenClaims.map((c) => recipientOf(c.item_id) ?? ""),
      ...givenContribs.map((c) => recipientOf(c.item_id) ?? ""),
      ...recvClaims.map((c) => c.buyer_id),
      ...recvContribs.map((c) => c.contributor_id),
    ]);

    const given: GiftRecord[] = [
      ...givenClaims.map((c) => {
        const it = itemMap.get(c.item_id);
        return {
          id: `gc-${c.id}`,
          title: it?.title ?? "A gift",
          personName: names.get(recipientOf(c.item_id) ?? "") ?? "Someone",
          when: c.created_at,
          priceCents: it?.price_cents ?? null,
          kind: "gift" as const,
        };
      }),
      ...givenContribs.map((c) => {
        const it = itemMap.get(c.item_id);
        return {
          id: `gk-${c.id}`,
          title: it?.title ?? "A group gift",
          personName: names.get(recipientOf(c.item_id) ?? "") ?? "Someone",
          when: c.created_at,
          priceCents: c.amount_cents,
          kind: "chipin" as const,
        };
      }),
    ];

    const received: GiftRecord[] = [
      ...recvClaims.map((c) => {
        const it = itemMap.get(c.item_id);
        return {
          id: `rc-${c.id}`,
          title: it?.title ?? "A gift",
          personName: names.get(c.buyer_id) ?? "Someone",
          when: c.created_at,
          priceCents: it?.price_cents ?? null,
          kind: "gift" as const,
        };
      }),
      ...recvContribs.map((c) => {
        const it = itemMap.get(c.item_id);
        return {
          id: `rk-${c.id}`,
          title: it?.title ?? "A group gift",
          personName: names.get(c.contributor_id) ?? "Someone",
          when: c.created_at,
          priceCents: c.amount_cents,
          kind: "chipin" as const,
        };
      }),
    ];

    return { given, received };
  },
};
