import type { Reaction } from "../types/database";

// The fixed reaction palette shown on each item.
export const REACTION_EMOJI = ["❤️", "👍", "🎉"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJI)[number];

export type ReactionTally = { emoji: ReactionEmoji; count: number; mine: boolean };

// Per-emoji count + whether the current user has used it. Pure — unit-tested.
export function reactionSummary(
  rows: Reaction[],
  userId: string | undefined,
): ReactionTally[] {
  return REACTION_EMOJI.map((emoji) => ({
    emoji,
    count: rows.reduce((n, r) => (r.emoji === emoji ? n + 1 : n), 0),
    mine: !!userId && rows.some((r) => r.emoji === emoji && r.user_id === userId),
  }));
}
