import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as haptics from "@/lib/haptics";
import { reactionsRepo } from "@/data/repositories/reactions";
import { subscribeToReactions } from "@/data/realtime";
import { reactionSummary, type ReactionEmoji } from "@/lib/reactions";
import { useAuth } from "@/providers/auth";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Reaction } from "@/types/database";

// Self-contained reaction bar for one item (loads + toggles its own state, so it
// needs no plumbing through the memoized list). Reactions are group-visible —
// the recipient sees them too (a ❤️ isn't a spoiler).
export function ItemReactions({ itemId }: { itemId: string }) {
  const { user } = useAuth();
  const userId = user?.id;
  const styles = useThemedStyles(makeStyles);
  const [rows, setRows] = useState<Reaction[]>([]);

  const reload = useCallback(() => {
    reactionsRepo.forItems([itemId]).then(setRows).catch(() => {});
  }, [itemId]);

  useEffect(() => {
    let active = true;
    reactionsRepo
      .forItems([itemId])
      .then((r) => {
        if (active) setRows(r);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [itemId]);

  // Live: refetch when anyone reacts on this item.
  useEffect(() => subscribeToReactions(itemId, reload), [itemId, reload]);

  async function toggle(emoji: ReactionEmoji) {
    if (!userId) return;
    const mine = rows.some((r) => r.emoji === emoji && r.user_id === userId);
    haptics.tap();
    setRows((cur) =>
      mine
        ? cur.filter((r) => !(r.emoji === emoji && r.user_id === userId))
        : [...cur, { item_id: itemId, user_id: userId, emoji, created_at: new Date().toISOString() }],
    );
    try {
      if (mine) await reactionsRepo.remove(itemId, emoji);
      else await reactionsRepo.add(itemId, emoji);
    } catch {
      reload(); // reconcile from server on failure
    }
  }

  return (
    <View style={styles.bar}>
      {reactionSummary(rows, userId).map((t) => (
        <Pressable
          key={t.emoji}
          onPress={() => toggle(t.emoji)}
          style={[styles.chip, t.mine && styles.chipMine]}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`React ${t.emoji}${t.mine ? " (added)" : ""}`}
        >
          <Text style={styles.emoji}>{t.emoji}</Text>
          {t.count > 0 ? <Text style={styles.count}>{t.count}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    bar: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipMine: { borderColor: c.accent, backgroundColor: c.accentSoft },
    emoji: { fontSize: 14 },
    count: { fontSize: 13, fontWeight: "700", color: c.textMuted },
  });
