import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { groupsRepo, type MemberWithProfile } from "@/data/repositories/groups";
import { santaRepo } from "@/data/repositories/santa";
import { parsePriceToCents } from "@/lib/validation";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { SantaExclusion } from "@/types/database";

// Admin-only: mark pairs who must never draw each other (couples, etc.). The
// draw (draw_secret_santa) honors these in both directions. RLS limits this
// table to group admins, so a non-admin who reaches this screen just sees errors.
export default function SantaExclusionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const showToast = useToast();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [exclusions, setExclusions] = useState<SantaExclusion[]>([]);
  const [firstPick, setFirstPick] = useState<string | null>(null);
  const [budgetText, setBudgetText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, ex, g] = await Promise.all([
        groupsRepo.membersWithProfiles(id),
        santaRepo.listExclusions(id),
        groupsRepo.get(id),
      ]);
      setMembers(m);
      setExclusions(ex);
      setBudgetText(
        g.santa_budget_cents != null ? (g.santa_budget_cents / 100).toFixed(2) : "",
      );
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load", "error");
    }
  }, [id, showToast]);

  async function saveBudget() {
    const cents = budgetText.trim() ? parsePriceToCents(budgetText) : null;
    if (budgetText.trim() && (cents == null || cents <= 0)) {
      showToast("Enter a valid amount", "error");
      return;
    }
    setBusy(true);
    try {
      await groupsRepo.setSantaBudget(id, cents);
      showToast(cents ? "Budget set 🎁" : "Budget cleared", "success");
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't save", "error");
    } finally {
      setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const nameOf = useCallback(
    (uid: string) => members.find((m) => m.user_id === uid)?.displayName ?? "Someone",
    [members],
  );

  const excludedKeys = useMemo(
    () => new Set(exclusions.map((e) => `${e.user_a}|${e.user_b}`)),
    [exclusions],
  );

  async function tapMember(uid: string) {
    if (busy) return;
    if (firstPick === null) {
      setFirstPick(uid);
      return;
    }
    if (firstPick === uid) {
      setFirstPick(null); // tapped the same person — deselect
      return;
    }
    const key = firstPick < uid ? `${firstPick}|${uid}` : `${uid}|${firstPick}`;
    if (excludedKeys.has(key)) {
      showToast("Those two are already excluded", "info");
      setFirstPick(null);
      return;
    }
    setBusy(true);
    try {
      await santaRepo.addExclusion(id, firstPick, uid);
      setFirstPick(null);
      await load();
      showToast("Pair excluded 🚫", "success");
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't add", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: SantaExclusion) {
    setBusy(true);
    try {
      await santaRepo.removeExclusion(id, e.user_a, e.user_b);
      await load();
    } catch (err) {
      showToast(String((err as Error).message) || "Couldn't remove", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Exclusions" }} />
      <FlatList
        data={members}
        keyExtractor={(m) => m.user_id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.sectionLabel}>Spending cap (optional)</Text>
            <View style={styles.budgetRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                style={styles.budgetInput}
                placeholder="e.g. 25"
                placeholderTextColor={colors.placeholder}
                keyboardType="decimal-pad"
                value={budgetText}
                onChangeText={setBudgetText}
                accessibilityLabel="Secret Santa spending cap"
              />
              <Button title="Save" variant="secondary" onPress={saveBudget} loading={busy} />
            </View>
            <Text style={styles.budgetHint}>Shown to everyone so nobody over- or under-spends.</Text>

            <Text style={styles.intro}>
              Pick two people who should never draw each other — like couples who
              already buy gifts together. The draw keeps them apart.
            </Text>
            {exclusions.length > 0 ? (
              <View style={styles.exList}>
                <Text style={styles.sectionLabel}>Excluded pairs</Text>
                {exclusions.map((e) => (
                  <View key={`${e.user_a}|${e.user_b}`} style={styles.pairRow}>
                    <Text style={styles.pairText}>
                      {nameOf(e.user_a)} <Text style={styles.amp}>⇄</Text> {nameOf(e.user_b)}
                    </Text>
                    <Pressable
                      onPress={() => remove(e)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove exclusion ${nameOf(e.user_a)} and ${nameOf(e.user_b)}`}
                    >
                      <Text style={styles.removeX}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.sectionLabel}>
              {firstPick
                ? `Now tap who ${nameOf(firstPick)} can't draw`
                : "Tap a person to start a pair"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const selected = firstPick === item.user_id;
          return (
            <Card
              style={[styles.memberRow, selected && styles.memberRowSel]}
              onPress={() => tapMember(item.user_id)}
              accessibilityLabel={
                (item.displayName ?? "Unnamed") + (selected ? ", first pick selected" : "")
              }
              accessibilityState={{ selected }}
            >
              <Text style={[styles.memberName, selected && styles.memberNameSel]}>
                {item.displayName ?? "Unnamed"}
              </Text>
              {selected ? <Text style={styles.pickHint}>1st pick</Text> : null}
            </Card>
          );
        }}
        ListEmptyComponent={<Text style={styles.intro}>No members yet.</Text>}
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 16, gap: 8 },
    budgetRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    dollar: { fontSize: 18, fontWeight: "700", color: c.text },
    budgetInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    budgetHint: { fontSize: 12, color: c.pageTextMuted, marginTop: 6, marginBottom: 4 },
    intro: { fontSize: 14, color: c.pageTextMuted, lineHeight: 20, marginBottom: 12 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: c.pageTextMuted,
      textTransform: "uppercase",
      marginTop: 12,
      marginBottom: 6,
    },
    exList: { gap: 6 },
    pairRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.accentSoft,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    pairText: { fontSize: 15, fontWeight: "600", color: c.onAccentSoft, flex: 1 },
    amp: { color: c.accent, fontWeight: "800" },
    removeX: { fontSize: 16, fontWeight: "800", color: c.onAccentSoft, paddingHorizontal: 4 },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
    },
    memberRowSel: { borderColor: c.accent, borderWidth: 2 },
    memberName: { fontSize: 16, fontWeight: "600", color: c.text },
    memberNameSel: { color: c.accent },
    pickHint: { fontSize: 12, fontWeight: "700", color: c.accent },
  });
