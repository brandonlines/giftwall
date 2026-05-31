import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { contributionsRepo } from "@/data/repositories/contributions";
import { subscribeToContributions } from "@/data/realtime";
import { fundedFraction, myContribution, sumCents } from "@/lib/contributions";
import { formatPrice } from "@/lib/format";
import { parsePriceToCents } from "@/lib/validation";
import { useAuth } from "@/providers/auth";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Contribution } from "@/types/database";

// Group gifting: members pool money toward one item. The Surprise Wall holds —
// RLS returns an empty set to the recipient, so an owner who somehow lands here
// just sees $0 / nobody.
export default function ChipInScreen() {
  const { id, title, price } = useLocalSearchParams<{
    id: string;
    title?: string;
    price?: string;
  }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();

  const [rows, setRows] = useState<Contribution[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [busy, setBusy] = useState(false);

  const userId = user?.id;
  const targetCents = price ? Number(price) : null;
  const mine = myContribution(rows, userId);

  const load = useCallback(async () => {
    try {
      const data = await contributionsRepo.forItems([id]);
      setRows(data);
      const m = myContribution(data, userId);
      setAmountText(m ? (m.amount_cents / 100).toFixed(2) : "");
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load", "error");
    } finally {
      setLoaded(true);
    }
  }, [id, userId, showToast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live: refresh as others chip in.
  useEffect(() => subscribeToContributions(id, load), [id, load]);

  async function submit() {
    const cents = parsePriceToCents(amountText);
    if (!cents || cents <= 0) {
      showToast("Enter an amount", "error");
      return;
    }
    setBusy(true);
    try {
      await contributionsRepo.chipIn(id, cents);
      showToast(mine ? "Pledge updated" : "You chipped in! 🎁", "success");
      await load();
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't save", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await contributionsRepo.remove(id);
      setAmountText("");
      showToast("Removed your pledge", "success");
      await load();
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't remove", "error");
    } finally {
      setBusy(false);
    }
  }

  const total = sumCents(rows);
  const frac = fundedFraction(rows, targetCents);
  const people = rows.length;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Group gift" }} />
      <View style={styles.wrap}>
        <Card style={styles.card}>
          <Text style={styles.itemTitle}>{title || "This gift"}</Text>
          {targetCents ? (
            <Text style={styles.goal}>Goal: {formatPrice(targetCents, null)}</Text>
          ) : (
            <Text style={styles.goal}>No set price — pool whatever you like.</Text>
          )}

          {!loaded ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 18 }} />
          ) : (
            <>
              {targetCents ? (
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.round(frac * 100)}%` }]} />
                </View>
              ) : null}
              <Text style={styles.progress}>
                {formatPrice(total, null)} pooled
                {targetCents ? ` of ${formatPrice(targetCents, null)}` : ""} ·{" "}
                {people} {people === 1 ? "person" : "people"} in
              </Text>
            </>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>{mine ? "Your pledge" : "Chip in"}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.placeholder}
              keyboardType="decimal-pad"
              value={amountText}
              onChangeText={setAmountText}
              accessibilityLabel="Contribution amount"
            />
          </View>
          <Button title={mine ? "Update pledge" : "Chip in"} onPress={submit} loading={busy} />
          {mine ? (
            <Button title="Remove my pledge" variant="danger" onPress={remove} loading={busy} />
          ) : null}
          <Text style={styles.note}>
            🤫 Only group members see this — never the recipient.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { padding: 16, gap: 12 },
    card: { padding: 16, gap: 10 },
    itemTitle: { fontSize: 18, fontWeight: "700", color: c.text },
    goal: { fontSize: 14, color: c.textMuted },
    barTrack: {
      height: 12,
      borderRadius: 6,
      backgroundColor: c.border,
      overflow: "hidden",
      marginTop: 4,
    },
    barFill: { height: 12, borderRadius: 6, backgroundColor: c.accent },
    progress: { fontSize: 14, color: c.text, fontWeight: "600" },
    label: { fontSize: 13, fontWeight: "700", color: c.textMuted, textTransform: "uppercase" },
    amountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    dollar: { fontSize: 22, fontWeight: "700", color: c.text },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 18,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    note: { fontSize: 12, color: c.textMuted, textAlign: "center", marginTop: 2 },
  });
