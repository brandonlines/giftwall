import type { Reservation } from "../types/database";

// Derives a wishlist item's "soft interest" UI state from the reservations the
// current user can see (RLS already hid anything they shouldn't — the recipient
// sees none). Pure + unit-tested so it can't silently regress.
export type ReserveState = {
  mine: boolean; // the current user has reserved this item
  others: number; // other people who've reserved it (0 for the recipient)
};

export function deriveReserveState(
  reservations: Reservation[],
  currentUserId: string | undefined,
): ReserveState {
  let mine = false;
  let others = 0;
  for (const r of reservations) {
    if (r.user_id === currentUserId) mine = true;
    else others += 1;
  }
  return { mine, others };
}
