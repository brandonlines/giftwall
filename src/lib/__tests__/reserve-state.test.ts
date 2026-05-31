import { deriveReserveState } from "../reserve-state";
import type { Reservation } from "../../types/database";

const r = (item_id: string, user_id: string): Reservation => ({
  id: `${item_id}:${user_id}`,
  item_id,
  user_id,
  created_at: "2026-01-01T00:00:00Z",
});

describe("deriveReserveState", () => {
  it("reports no interest for an empty set", () => {
    expect(deriveReserveState([], "me")).toEqual({ mine: false, others: 0 });
  });

  it("flags my own reservation and excludes it from the others count", () => {
    expect(deriveReserveState([r("i1", "me")], "me")).toEqual({ mine: true, others: 0 });
  });

  it("counts other people considering the item", () => {
    const rows = [r("i1", "me"), r("i1", "a"), r("i1", "b")];
    expect(deriveReserveState(rows, "me")).toEqual({ mine: true, others: 2 });
  });

  it("from the recipient's view (RLS returns none) shows nothing", () => {
    expect(deriveReserveState([], "owner")).toEqual({ mine: false, others: 0 });
  });

  it("treats all reservations as others when none are mine", () => {
    expect(deriveReserveState([r("i1", "a"), r("i1", "b")], "me")).toEqual({
      mine: false,
      others: 2,
    });
  });
});
