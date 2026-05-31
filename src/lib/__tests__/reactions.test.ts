import { reactionSummary, REACTION_EMOJI } from "../reactions";
import type { Reaction } from "../../types/database";

const r = (user_id: string, emoji: string): Reaction => ({
  item_id: "i1",
  user_id,
  emoji,
  created_at: "2026-01-01T00:00:00Z",
});

describe("reactionSummary", () => {
  it("counts each emoji and flags the current user's own", () => {
    const rows = [r("a", "❤️"), r("b", "❤️"), r("a", "🎉")];
    const sum = reactionSummary(rows, "a");
    const heart = sum.find((s) => s.emoji === "❤️")!;
    const party = sum.find((s) => s.emoji === "🎉")!;
    const thumb = sum.find((s) => s.emoji === "👍")!;
    expect(heart.count).toBe(2);
    expect(heart.mine).toBe(true);
    expect(party.count).toBe(1);
    expect(party.mine).toBe(true);
    expect(thumb.count).toBe(0);
    expect(thumb.mine).toBe(false);
  });

  it("returns one entry per palette emoji, none 'mine' when signed out", () => {
    const sum = reactionSummary([r("a", "❤️")], undefined);
    expect(sum).toHaveLength(REACTION_EMOJI.length);
    expect(sum.every((s) => s.mine === false)).toBe(true);
  });
});
