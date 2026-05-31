import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { giftHistoryRepo, type GiftHistory } from "@/data/repositories/gift-history";
import { groupByYear } from "@/lib/gift-history";
import { formatPrice } from "@/lib/format";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

type Tab = "given" | "received";

export default function GiftHistoryScreen() {
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [history, setHistory] = useState<GiftHistory | null>(null);
  const [tab, setTab] = useState<Tab>("given");

  const load = useCallback(async () => {
    try {
      setHistory(await giftHistoryRepo.mine());
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load history", "error");
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const groups = useMemo(() => {
    const records = tab === "given" ? (history?.given ?? []) : (history?.received ?? []);
    return groupByYear(records);
  }, [history, tab]);

  return (
    <Screen>
      <Stack.Screen options={{ title: "Gift history" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segment}>
          <SegBtn label={`🎁 Given (${history?.given.length ?? 0})`} on={tab === "given"} onPress={() => setTab("given")} />
          <SegBtn
            label={`💝 Received (${history?.received.length ?? 0})`}
            on={tab === "received"}
            onPress={() => setTab("received")}
          />
        </View>

        {!history ? (
          <View style={{ gap: 12 }}>
            {[0, 1].map((k) => (
              <SkeletonCard key={k} />
            ))}
          </View>
        ) : groups.length === 0 ? (
          <EmptyState
            emoji={tab === "given" ? "🎁" : "💝"}
            title={tab === "given" ? "No gifts given yet" : "No gifts to show yet"}
            hint={
              tab === "given"
                ? "Gifts you claim or chip in on will be remembered here, by year."
                : "Gifts others reveal they gave you appear here after the occasion."
            }
          />
        ) : (
          groups.map((g) => (
            <View key={g.year} style={styles.yearBlock}>
              <Text style={styles.year}>{g.year}</Text>
              {g.records.map((r) => (
                <Card key={r.id} style={styles.row}>
                  <Text style={styles.emoji}>{r.kind === "chipin" ? "💸" : "🎁"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text style={styles.person}>
                      {tab === "given" ? "to " : "from "}
                      {r.personName}
                      {r.kind === "chipin" ? " · chipped in" : ""}
                    </Text>
                  </View>
                  {r.priceCents != null ? (
                    <Text style={styles.price}>{formatPrice(r.priceCents, null)}</Text>
                  ) : null}
                </Card>
              ))}
            </View>
          ))
        )}
      </ScrollView>
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

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 16, gap: 8 },
    segment: { flexDirection: "row", gap: 8, marginBottom: 8 },
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
    yearBlock: { marginTop: 8 },
    year: {
      fontSize: 13,
      fontWeight: "800",
      color: c.pageTextMuted,
      letterSpacing: 0.5,
      marginBottom: 6,
      marginLeft: 4,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 8 },
    emoji: { fontSize: 22 },
    title: { fontSize: 16, fontWeight: "600", color: c.text },
    person: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    price: { fontSize: 14, fontWeight: "700", color: c.accent },
  });
