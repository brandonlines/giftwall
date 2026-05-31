import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { thanksRepo, type ReceivedThanks } from "@/data/repositories/thanks";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

// The giver's inbox: thank-you notes from people you gave gifts to (RLS returns
// only rows addressed to you).
export default function ThanksScreen() {
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [rows, setRows] = useState<ReceivedThanks[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await thanksRepo.received());
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

  return (
    <Screen>
      <Stack.Screen options={{ title: "Thank-yous" }} />
      <FlatList
        data={rows}
        keyExtractor={(t, i) => `${t.itemId}-${i}`}
        contentContainerStyle={styles.content}
        renderItem={({ item: t }) => (
          <Card style={styles.row}>
            <Text style={styles.message}>“{t.message}”</Text>
            <Text style={styles.meta}>
              🙏 {t.fromName} · for {t.itemTitle}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          !loaded ? (
            <View style={{ gap: 12 }}>
              {[0, 1].map((k) => (
                <SkeletonCard key={k} />
              ))}
            </View>
          ) : (
            <EmptyState
              emoji="🙏"
              title="No thank-yous yet"
              hint="When someone you gave a gift to says thanks, it shows up here."
            />
          )
        }
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 16, gap: 10 },
    row: { padding: 16, gap: 6 },
    message: { fontSize: 16, color: c.text, fontWeight: "600", lineHeight: 22 },
    meta: { fontSize: 13, color: c.textMuted },
  });
