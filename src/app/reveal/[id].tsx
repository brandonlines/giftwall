import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { claimsRepo } from "@/data/repositories/claims";
import { contributionsRepo } from "@/data/repositories/contributions";
import { groupsRepo } from "@/data/repositories/groups";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Item } from "@/types/database";

// The giftee's half of the two-party reveal. Turning the switch on sets
// reveal_requested on the list; even then, RLS only returns claims/contributions
// whose giver has ALSO opted in (claims.revealed / contributions.revealed), so a
// recipient can never peek early — nothing shows until both sides agree.
type RevealRow = { item: Item; givers: string[]; contributors: string[] };

export default function RevealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [requested, setRequested] = useState(false);
  const [rows, setRows] = useState<RevealRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await wishlistsRepo.get(id);
      setRequested(list.reveal_requested);
      const items = await wishlistsRepo.items(id);
      const itemIds = items.map((i) => i.id);
      const [claims, contribs, members] = await Promise.all([
        claimsRepo.forItems(itemIds),
        contributionsRepo.forItems(itemIds),
        groupsRepo.membersWithProfiles(list.group_id),
      ]);
      const nameOf = (uid: string) =>
        members.find((m) => m.user_id === uid)?.displayName ?? "Someone";
      const built: RevealRow[] = items
        .map((item) => ({
          item,
          givers: claims.filter((c) => c.item_id === item.id).map((c) => nameOf(c.buyer_id)),
          contributors: contribs
            .filter((c) => c.item_id === item.id)
            .map((c) => nameOf(c.contributor_id)),
        }))
        .filter((r) => r.givers.length > 0 || r.contributors.length > 0);
      setRows(built);
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load", "error");
    } finally {
      setLoaded(true);
    }
  }, [id, showToast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function toggleRequested(v: boolean) {
    setBusy(true);
    setRequested(v);
    try {
      await wishlistsRepo.setRevealRequested(id, v);
      await load();
    } catch (e) {
      setRequested(!v);
      showToast(String((e as Error).message) || "Couldn't update", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Who gave what" }} />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <Card style={styles.toggleCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>See who gave what</Text>
              <Text style={styles.toggleHint}>
                Off keeps the surprise. On, each gift appears only once its giver
                also chooses to reveal it — so nothing spoils early.
              </Text>
            </View>
            <Switch value={requested} onValueChange={toggleRequested} disabled={busy} />
          </Card>
        }
        renderItem={({ item: r }) => (
          <Card style={styles.row}>
            <Text style={styles.itemTitle}>{r.item.title}</Text>
            {r.givers.map((n, i) => (
              <Text key={`g${i}`} style={styles.giver}>
                🎁 from {n}
              </Text>
            ))}
            {r.contributors.length > 0 ? (
              <Text style={styles.giver}>💛 chipped in: {r.contributors.join(", ")}</Text>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              emoji={requested ? "🤫" : "🎁"}
              title={requested ? "Nothing revealed yet" : "Surprise still on"}
              hint={
                requested
                  ? "Gifts appear here as each giver chooses to reveal them."
                  : 'Flip "See who gave what" on when you\'re ready — after the occasion.'
              }
            />
          ) : null
        }
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 16, gap: 10 },
    toggleCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      marginBottom: 6,
    },
    toggleTitle: { fontSize: 16, fontWeight: "800", color: c.text },
    toggleHint: { fontSize: 13, color: c.textMuted, marginTop: 4, lineHeight: 18 },
    row: { padding: 16, gap: 4 },
    itemTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    giver: { fontSize: 15, color: c.accent, fontWeight: "600" },
  });
