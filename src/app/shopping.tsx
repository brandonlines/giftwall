import { useCallback, useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { shoppingRepo, type ShoppingEntry } from "@/data/repositories/shopping";
import { claimsRepo } from "@/data/repositories/claims";
import { contributionsRepo } from "@/data/repositories/contributions";
import { formatPrice } from "@/lib/format";
import { spendingTotals } from "@/lib/spending";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Contribution } from "@/types/database";

type Section = { title: string; subtitle: string; data: ShoppingEntry[] };

export default function ShoppingScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const showToast = useToast();
  const router = useRouter();
  const [entries, setEntries] = useState<ShoppingEntry[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<"tobuy" | "purchased">("tobuy");
  const [sort, setSort] = useState<"group" | "name">("group");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const [e, c] = await Promise.all([shoppingRepo.mine(), contributionsRepo.mine()]);
      setEntries(e);
      setContributions(c);
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load", "error");
    } finally {
      setLoaded(true);
    }
  }, [showToast]);

  const totals = useMemo(
    () => spendingTotals(entries.map((e) => e.priceCents), contributions.map((c) => c.amount_cents)),
    [entries, contributions],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (filter === "purchased" ? e.status === "purchased" : e.status !== "purchased") &&
        (!q ||
          e.title.toLowerCase().includes(q) ||
          e.groupName.toLowerCase().includes(q) ||
          e.listTitle.toLowerCase().includes(q)),
    );
  }, [entries, filter, search]);

  const sections = useMemo<Section[]>(() => {
    if (sort === "name") {
      return [
        {
          title: "",
          subtitle: "",
          data: [...visible].sort((a, b) => a.title.localeCompare(b.title)),
        },
      ];
    }
    const byList = new Map<string, Section>();
    for (const e of visible) {
      const key = `${e.listTitle}__${e.groupName}`;
      if (!byList.has(key)) {
        byList.set(key, { title: e.listTitle, subtitle: e.groupName, data: [] });
      }
      byList.get(key)!.data.push(e);
    }
    return [...byList.values()];
  }, [visible, sort]);

  const remaining = entries.filter((e) => e.status !== "purchased").length;
  const purchasedCount = entries.length - remaining;

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
      <Stack.Screen
        options={{
          title: "Shopping",
          headerRight: () => (
            <View style={styles.headerRight}>
              <Pressable
                hitSlop={10}
                onPress={() => router.push("/gift-history")}
                accessibilityRole="button"
                accessibilityLabel="Gift history"
              >
                <Text style={styles.headerLink} maxFontSizeMultiplier={1.4}>🎁 History</Text>
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={() => router.push("/thanks")}
                accessibilityRole="button"
                accessibilityLabel="Thank-you notes"
              >
                <Text style={styles.headerLink} maxFontSizeMultiplier={1.4}>🙏 Thanks</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      {entries.length > 1 ? (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search your shopping list…"
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Search your shopping list"
          />
        </View>
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.claimId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          entries.length > 0 || totals.totalCents > 0 ? (
            <View>
              {totals.totalCents > 0 ? (
                <Card style={styles.summaryCard}>
                  <Text style={styles.summaryTotal}>
                    💸 You&apos;ve committed ~{formatPrice(totals.totalCents, null)}
                  </Text>
                  <Text style={styles.summaryBreakdown}>
                    {formatPrice(totals.claimedCents, null)} in gifts ·{" "}
                    {formatPrice(totals.chippedCents, null)} chipped in · {totals.giftCount}{" "}
                    {totals.giftCount === 1 ? "gift" : "gifts"}
                  </Text>
                </Card>
              ) : null}
              {entries.length > 0 ? (
                <View style={styles.controls}>
                  <View style={styles.segment}>
                    <SegBtn label={`🛒 To buy (${remaining})`} on={filter === "tobuy"} onPress={() => setFilter("tobuy")} />
                    <SegBtn label={`✅ Purchased (${purchasedCount})`} on={filter === "purchased"} onPress={() => setFilter("purchased")} />
                  </View>
                  <View style={styles.segment}>
                    <SegBtn label="By group" on={sort === "group"} onPress={() => setSort("group")} />
                    <SegBtn label="By name" on={sort === "name"} onPress={() => setSort("name")} />
                  </View>
                </View>
              ) : null}
            </View>
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
              emoji={filter === "purchased" ? "✅" : "🛍️"}
              title={filter === "purchased" ? "Nothing bought yet" : "Nothing to buy yet"}
              hint={
                filter === "purchased"
                  ? "Gifts you mark as bought show up here."
                  : "Gifts you claim across your groups show up here."
              }
            />
          )
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text style={styles.sectionHeader}>
              {section.title} · {section.subtitle}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <ShoppingRow entry={item} onToggle={togglePurchased} />
        )}
      />
    </Screen>
  );
}

function SegBtn({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segBtn, on && styles.segBtnOn]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
    >
      <Text style={[styles.segBtnText, on && styles.segBtnTextOn]} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
    </Pressable>
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
      <View
        style={[styles.checkbox, purchased && styles.checkboxOn]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
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
    searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
    search: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    headerLink: { color: c.headerTint, fontWeight: "700", fontSize: 15 },
    headerRight: { flexDirection: "row", gap: 16, alignItems: "center" },
    summaryCard: { padding: 16, marginBottom: 12, gap: 4 },
    summaryTotal: { fontSize: 18, fontWeight: "800", color: c.text },
    summaryBreakdown: { fontSize: 13, color: c.textMuted },
    controls: { gap: 8, marginBottom: 12 },
    segment: { flexDirection: "row", gap: 8 },
    segBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
      alignItems: "center",
    },
    segBtnOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
    segBtnText: { fontSize: 13, fontWeight: "700", color: c.pageTextMuted },
    segBtnTextOn: { color: c.onAccentSoft },
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
