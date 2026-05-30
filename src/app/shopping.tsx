import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { shoppingRepo, type ShoppingEntry } from "@/data/repositories/shopping";
import { claimsRepo } from "@/data/repositories/claims";
import { formatPrice } from "@/lib/format";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

type Section = { title: string; subtitle: string; data: ShoppingEntry[] };

export default function ShoppingScreen() {
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [entries, setEntries] = useState<ShoppingEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setEntries(await shoppingRepo.mine());
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load", "error");
    } finally {
      setLoaded(true);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const sections = useMemo<Section[]>(() => {
    const byList = new Map<string, Section>();
    for (const e of entries) {
      const key = `${e.listTitle}__${e.groupName}`;
      if (!byList.has(key)) {
        byList.set(key, { title: e.listTitle, subtitle: e.groupName, data: [] });
      }
      byList.get(key)!.data.push(e);
    }
    return [...byList.values()];
  }, [entries]);

  const remaining = entries.filter((e) => e.status !== "purchased").length;

  const togglePurchased = useCallback(
    async (entry: ShoppingEntry) => {
      const next = entry.status !== "purchased";
      setEntries((prev) =>
        prev.map((e) =>
          e.claimId === entry.claimId
            ? { ...e, status: next ? "purchased" : "claimed" }
            : e,
        ),
      );
      try {
        await claimsRepo.setPurchased(entry.itemId, next);
      } catch (e) {
        showToast(String((e as Error).message) || "Couldn't update", "error");
        await load();
      }
    },
    [showToast, load],
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: "Shopping" }} />
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.claimId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          entries.length > 0 ? (
            <Text style={styles.summary}>
              {remaining === 0 ? "All bought 🎉" : `${remaining} left to buy`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !loaded ? (
            <View style={{ gap: 12 }}>
              {[0, 1].map((k) => (
                <SkeletonCard key={k} />
              ))}
            </View>
          ) : (
            <EmptyState
              emoji="🛍️"
              title="Nothing to buy yet"
              hint="Gifts you claim across your groups show up here."
            />
          )
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>
            {section.title} · {section.subtitle}
          </Text>
        )}
        renderItem={({ item }) => (
          <ShoppingRow entry={item} onToggle={togglePurchased} />
        )}
      />
    </Screen>
  );
}

function ShoppingRow({
  entry,
  onToggle,
}: {
  entry: ShoppingEntry;
  onToggle: (entry: ShoppingEntry) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const purchased = entry.status === "purchased";
  return (
    <Card
      style={styles.row}
      onPress={() => onToggle(entry)}
      accessibilityLabel={`${entry.title}, ${purchased ? "bought" : "not bought"}`}
    >
      <View style={[styles.checkbox, purchased && styles.checkboxOn]}>
        {purchased && <Text style={styles.check}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, purchased && styles.titleDone]} numberOfLines={1}>
          {entry.title}
        </Text>
        {entry.priceCents != null && (
          <Text style={styles.price}>{formatPrice(entry.priceCents, entry.currency)}</Text>
        )}
      </View>
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 16, gap: 8 },
    summary: { fontSize: 15, fontWeight: "700", color: c.pageText, marginBottom: 8 },
    sectionHeader: {
      fontSize: 13,
      fontWeight: "700",
      color: c.pageTextMuted,
      textTransform: "uppercase",
      marginTop: 16,
      marginBottom: 6,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxOn: { backgroundColor: c.claimMine, borderColor: c.claimMine },
    check: { color: c.onClaimMine, fontWeight: "800", fontSize: 15 },
    title: { fontSize: 16, fontWeight: "600", color: c.text },
    titleDone: { textDecorationLine: "line-through", color: c.textMuted },
    price: { fontSize: 14, color: c.textMuted, marginTop: 2 },
  });
