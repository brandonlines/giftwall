import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { activityRepo, type ActivityEntry } from "@/data/repositories/activity";
import { subscribeToActivity } from "@/data/realtime";
import { relativeTime } from "@/lib/format";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

const PAGE = 30;

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await activityRepo.listForGroup(id, { limit: PAGE });
      setEntries(rows);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load activity", "error");
    } finally {
      setLoaded(true);
    }
  }, [id, showToast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live updates: refresh the first page when new activity lands.
  useEffect(() => {
    const unsub = subscribeToActivity(id, () => void load());
    return unsub;
  }, [id, load]);

  async function loadMore() {
    if (loadingMore || !hasMore || entries.length === 0) return;
    setLoadingMore(true);
    try {
      const before = entries[entries.length - 1].created_at;
      const rows = await activityRepo.listForGroup(id, { limit: PAGE, before });
      setEntries((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load more", "error");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Activity" }} />
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListEmptyComponent={
          !loaded ? (
            <View style={styles.skeletons}>
              {[0, 1, 2, 3].map((k) => (
                <Skeleton key={k} height={52} radius={12} />
              ))}
            </View>
          ) : (
            <EmptyState emoji="📭" title="No activity yet" hint="Group actions will show up here." />
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.more}>
              <Button
                title={loadingMore ? "Loading…" : "Load more"}
                variant="secondary"
                onPress={loadMore}
                loading={loadingMore}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <Text style={styles.icon}>{iconFor(item)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{describe(item)}</Text>
              <Text style={styles.time}>{relativeTime(item.created_at)}</Text>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}

function iconFor(e: ActivityEntry): string {
  switch (e.type) {
    case "member_joined":
      return "👋";
    case "list_created":
      return "📝";
    case "item_added":
      return "🎁";
  }
}

function describe(e: ActivityEntry): string {
  switch (e.type) {
    case "member_joined":
      return `${e.actorName} joined the group`;
    case "list_created":
      return `${e.actorName} created "${e.list_title ?? "a list"}"`;
    case "item_added":
      return `${e.actorName} added "${e.item_title ?? "an item"}" to ${e.list_title ?? "a list"}`;
  }
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 8 },
    skeletons: { gap: 8 },
    more: { marginTop: 12 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    icon: { fontSize: 22 },
    text: { fontSize: 15, color: c.text },
    time: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  });
