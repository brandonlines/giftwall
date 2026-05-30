import type { Claim } from "../types/database";

// Derives a wishlist item's claim UI state from the claims the current user can
// see (RLS already hid anything they shouldn't). Pure + unit-tested so the
// multi-quantity / Surprise-Wall logic can't silently regress.
export type ClaimState = {
  mine: Claim | undefined; // the current user's own claim, if any
  count: number; // claims visible to the user (0 for the recipient)
  full: boolean; // item is fully claimed and not by me
  purchased: boolean; // my claim is marked purchased
};

export function deriveClaimState(
  claims: Claim[],
  currentUserId: string | undefined,
  quantity: number,
): ClaimState {
  const mine = claims.find((c) => c.buyer_id === currentUserId);
  const count = claims.length;
  return {
    mine,
    count,
    full: !mine && count >= quantity,
    purchased: mine?.status === "purchased",
  };
}
