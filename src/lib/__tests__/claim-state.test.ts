import { deriveClaimState } from "../claim-state";
import type { Claim } from "../../types/database";

const claim = (buyer: string, status: "claimed" | "purchased" = "claimed"): Claim => ({
  id: `c-${buyer}`,
  item_id: "i",
  buyer_id: buyer,
  status,
  created_at: "",
});

describe("deriveClaimState", () => {
  it("recipient sees no claims → nothing claimed, not full", () => {
    const s = deriveClaimState([], "me", 1);
    expect(s.mine).toBeUndefined();
    expect(s.count).toBe(0);
    expect(s.full).toBe(false);
  });

  it("single-qty claimed by someone else → full", () => {
    const s = deriveClaimState([claim("bob")], "me", 1);
    expect(s.full).toBe(true);
    expect(s.mine).toBeUndefined();
  });

  it("claimed by me → mine set, never full for me", () => {
    const s = deriveClaimState([claim("me")], "me", 1);
    expect(s.mine).toBeDefined();
    expect(s.full).toBe(false);
  });

  it("multi-qty partially claimed → not full", () => {
    const s = deriveClaimState([claim("bob")], "me", 3);
    expect(s.count).toBe(1);
    expect(s.full).toBe(false);
  });

  it("multi-qty fully claimed by others → full", () => {
    const s = deriveClaimState([claim("bob"), claim("carol")], "me", 2);
    expect(s.count).toBe(2);
    expect(s.full).toBe(true);
  });

  it("reflects purchased status of my own claim", () => {
    expect(deriveClaimState([claim("me", "purchased")], "me", 1).purchased).toBe(true);
    expect(deriveClaimState([claim("me")], "me", 1).purchased).toBe(false);
  });
});
