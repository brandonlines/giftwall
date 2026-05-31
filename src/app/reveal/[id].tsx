import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { claimsRepo } from "@/data/repositories/claims";
import { contributionsRepo } from "@/data/repositories/contributions";
import { groupsRepo } from "@/data/repositories/groups";
import { thanksRepo } from "@/data/repositories/thanks";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Item } from "@/types/database";

// The giftee's half of the two-party reveal. Turning the switch on sets
// reveal_requested on the list; even then, RLS only returns claims/contributions
// whose giver has ALSO opted in, so a recipient can never peek early. Once a gift
// is revealed, the recipient can thank its giver right here.
type Giver = { id: string; name: string };
type RevealRow = { item: Item; givers: Giver[]; contributors: Giver[] };

const thankKey = (itemId: string, toId: string) => `${itemId}:${toId}`;
const THANKS_MESSAGE = "Thank you so much! 🎁";

export default function RevealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const showToast = useToast();
  const [requested, setRequested] = useState(false);
  const [rows, setRows] = useState<RevealRow[]>([]);
  const [thanked, setThanked] = useState<Set<string>>(() => new Set());
  const [sentMsg, setSentMsg] = useState<Map<string, string>>(() => new Map());
  const [compose, setCompose] = useState<{ itemId: string; giver: Giver } | null>(null);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await wishlistsRepo.get(id);
      setRequested(list.reveal_requested);
      const items = await wishlistsRepo.items(id);
      const itemIds = items.map((i) => i.id);
      const [claims, contribs, members, sent] = await Promise.all([
        claimsRepo.forItems(itemIds),
        contributionsRepo.forItems(itemIds),
        groupsRepo.membersWithProfiles(list.group_id),
        thanksRepo.sentForItems(itemIds),
      ]);
      const nameOf = (uid: string) =>
        members.find((m) => m.user_id === uid)?.displayName ?? "Someone";
      const built: RevealRow[] = items
        .map((item) => ({
          item,
          givers: claims
            .filter((c) => c.item_id === item.id)
            .map((c) => ({ id: c.buyer_id, name: nameOf(c.buyer_id) })),
          contributors: contribs
            .filter((c) => c.item_id === item.id)
            .map((c) => ({ id: c.contributor_id, name: nameOf(c.contributor_id) })),
        }))
        .filter((r) => r.givers.length > 0 || r.contributors.length > 0);
      setRows(built);
      setThanked(new Set(sent.map((t) => thankKey(t.item_id, t.to_id))));
      setSentMsg(new Map(sent.map((t) => [thankKey(t.item_id, t.to_id), t.message])));
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

  // Open the composer prefilled with the existing note (or a friendly default).
  function openCompose(itemId: string, giver: Giver) {
    setDraft(sentMsg.get(thankKey(itemId, giver.id)) ?? THANKS_MESSAGE);
    setCompose({ itemId, giver });
  }

  async function confirmThanks() {
    if (!compose) return;
    const { itemId, giver } = compose;
    const message = draft.trim() || THANKS_MESSAGE;
    const k = thankKey(itemId, giver.id);
    setBusy(true);
    try {
      await thanksRepo.send(itemId, giver.id, message);
      setThanked((s) => new Set(s).add(k));
      setSentMsg((m) => new Map(m).set(k, message));
      setCompose(null);
      showToast(`Thanked ${giver.name} 🙏`, "success");
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't send thanks", "error");
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
              <Text style={styles.toggleTitle} accessibilityRole="header">See who gave what</Text>
              <Text style={styles.toggleHint}>
                Off keeps the surprise. On, each gift appears only once its giver
                also chooses to reveal it — then you can say thanks.
              </Text>
            </View>
            <Switch
              value={requested}
              onValueChange={toggleRequested}
              disabled={busy}
              accessibilityLabel="See who gave what"
            />
          </Card>
        }
        renderItem={({ item: r }) => (
          <Card style={styles.row}>
            <Text style={styles.itemTitle}>{r.item.title}</Text>
            {r.givers.map((g) => (
              <GiverRow
                key={`c-${g.id}`}
                itemId={r.item.id}
                giver={g}
                label={`🎁 from ${g.name}`}
                isThanked={thanked.has(thankKey(r.item.id, g.id))}
                onThank={openCompose}
              />
            ))}
            {r.contributors.map((g) => (
              <GiverRow
                key={`p-${g.id}`}
                itemId={r.item.id}
                giver={g}
                label={`💛 ${g.name} chipped in`}
                isThanked={thanked.has(thankKey(r.item.id, g.id))}
                onThank={openCompose}
              />
            ))}
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

      <Modal
        visible={!!compose}
        transparent
        animationType="fade"
        onRequestClose={() => setCompose(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Thank {compose?.giver.name ?? "them"} 🙏</Text>
            <TextInput
              style={styles.modalInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a thank-you…"
              placeholderTextColor={colors.placeholder}
              multiline
              maxLength={300}
              autoFocus
            />
            <Button title="Send thanks" onPress={confirmThanks} loading={busy} />
            <Pressable onPress={() => setCompose(null)} hitSlop={8} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function GiverRow({
  itemId,
  giver,
  label,
  isThanked,
  onThank,
}: {
  itemId: string;
  giver: Giver;
  label: string;
  isThanked: boolean;
  onThank: (itemId: string, giver: Giver) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.giverRow}>
      <Text style={styles.giver}>{label}</Text>
      <Pressable
        onPress={() => onThank(itemId, giver)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${isThanked ? "Edit thanks to" : "Say thanks to"} ${giver.name}`}
      >
        <Text style={[styles.thank, isThanked && styles.thankedText]}>
          {isThanked ? "Thanked ✓" : "Say thanks 🙏"}
        </Text>
      </Pressable>
    </View>
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
    row: { padding: 16, gap: 8 },
    itemTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    giverRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    giver: { fontSize: 15, color: c.accent, fontWeight: "600", flex: 1 },
    thank: { fontSize: 14, fontWeight: "700", color: c.accent },
    thankedText: { color: c.textMuted },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 24,
    },
    modalCard: { backgroundColor: c.surface, borderRadius: 16, padding: 20, gap: 12 },
    modalTitle: { fontSize: 17, fontWeight: "800", color: c.text },
    modalInput: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      minHeight: 90,
      textAlignVertical: "top",
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    modalCancel: { alignItems: "center", paddingVertical: 4 },
    modalCancelText: { color: c.textMuted, fontWeight: "600" },
  });
