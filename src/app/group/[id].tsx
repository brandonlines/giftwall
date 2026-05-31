import { memo, useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { formatCountdown, isValidDateStr } from "@/lib/dates";
import { groupsRepo } from "@/data/repositories/groups";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { santaRepo } from "@/data/repositories/santa";
import { subscribeToSanta } from "@/data/realtime";
import { useAuth } from "@/providers/auth";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Group, Wishlist } from "@/types/database";

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [group, setGroup] = useState<Group | null>(null);
  const [lists, setLists] = useState<Wishlist[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [santaReceiver, setSantaReceiver] = useState<string | null>(null);
  const [santaDrawn, setSantaDrawn] = useState(false);
  const [santaBusy, setSantaBusy] = useState(false);
  const showToast = useToast();

  const onListOpen = useCallback((listId: string) => router.push(`/list/${listId}`), [router]);

  const load = useCallback(async () => {
    try {
      const [g, ls, members] = await Promise.all([
        groupsRepo.get(id),
        wishlistsRepo.listForGroup(id),
        groupsRepo.members(id),
      ]);
      setGroup(g);
      setLists(ls);
      setIsAdmin(
        members.some((m) => m.user_id === user?.id && m.role === "admin"),
      );
      if (g.event_type === "secret_santa") {
        const [assignment, drawn, withProfiles] = await Promise.all([
          santaRepo.myAssignment(id),
          santaRepo.isDrawn(id),
          groupsRepo.membersWithProfiles(id),
        ]);
        setSantaDrawn(drawn);
        const rec = assignment
          ? withProfiles.find((m) => m.user_id === assignment.receiver_id)
          : null;
        setSantaReceiver(assignment ? rec?.displayName || "your match" : null);
      } else {
        setSantaDrawn(false);
        setSantaReceiver(null);
      }
    } catch (e) {
      Alert.alert("Couldn't load lists", String((e as Error).message));
    }
  }, [id, user?.id]);

  async function rotateCode() {
    try {
      const code = await groupsRepo.rotateInviteCode(id);
      setGroup((g) => (g ? { ...g, invite_code: code } : g));
      Alert.alert("New code", `The invite code is now ${code}.`);
    } catch (e) {
      Alert.alert("Couldn't rotate code", String((e as Error).message));
    }
  }

  async function drawSecretSanta() {
    setSantaBusy(true);
    try {
      await santaRepo.draw(id);
      showToast("Names drawn! 🤫", "success");
      await load();
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't draw names", "error");
    } finally {
      setSantaBusy(false);
    }
  }

  function shareInvite() {
    if (!group) return;
    // Link carries this group's unique code, so it joins exactly this group.
    const url = Linking.createURL(`join/${group.invite_code}`);
    void Share.share({
      message:
        `Join "${group.name}" on giftwall:\n${url}\n\n` +
        `Or open the app and enter code ${group.invite_code}.`,
    });
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live: a Secret Santa draw pushes each member their own assignment.
  useEffect(() => {
    if (group?.event_type !== "secret_santa") return;
    return subscribeToSanta(id, load);
  }, [id, group?.event_type, load]);

  async function createList() {
    if (!title.trim()) return;
    const date = eventDate.trim();
    if (date && !isValidDateStr(date)) {
      showToast("Use a date like 2026-12-25", "error");
      return;
    }
    setBusy(true);
    try {
      await wishlistsRepo.create(id, title.trim(), date || null);
      setTitle("");
      setEventDate("");
      await load();
    } catch (e) {
      Alert.alert("Couldn't create list", String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: group?.name ?? "Group",
          headerRight: () => (
            <Pressable hitSlop={10} onPress={shareInvite}>
              <Text style={styles.invite}>Invite</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={lists}
        keyExtractor={(l) => l.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          group ? (
            <View>
              <Card style={styles.codeCard} onPress={() => router.push(`/group-qr/${id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeLabel}>Invite code · tap for QR</Text>
                  <Text style={styles.code}>{group.invite_code}</Text>
                </View>
                {isAdmin && (
                  <Pressable onPress={rotateCode} hitSlop={10}>
                    <Text style={styles.rotate}>Rotate</Text>
                  </Pressable>
                )}
              </Card>
              <View style={styles.linkRow}>
                <Pressable
                  style={styles.membersLink}
                  onPress={() => router.push(`/members/${id}`)}
                >
                  <Text style={styles.membersText}>View members</Text>
                </Pressable>
                <Pressable
                  style={styles.membersLink}
                  onPress={() => router.push(`/activity/${id}`)}
                >
                  <Text style={styles.membersText}>Activity</Text>
                </Pressable>
                {isAdmin && (
                  <Pressable
                    style={styles.membersLink}
                    onPress={() => router.push(`/edit-group/${id}`)}
                  >
                    <Text style={styles.membersText}>Edit group</Text>
                  </Pressable>
                )}
              </View>
              {group.event_type === "secret_santa" ? (
                <Card style={styles.santaCard}>
                  <Text style={styles.santaTitle}>🤫 Secret Santa</Text>
                  {santaReceiver ? (
                    <Text style={styles.santaText}>
                      You&apos;re buying for:{" "}
                      <Text style={styles.santaName}>{santaReceiver}</Text>
                    </Text>
                  ) : santaDrawn ? (
                    <Text style={styles.santaText}>
                      {isAdmin
                        ? "Names are drawn, but you're not in this draw — re-draw to include everyone."
                        : "Names are drawn, but you're not in this one — ask the admin to re-draw."}
                    </Text>
                  ) : (
                    <Text style={styles.santaText}>
                      {isAdmin
                        ? "Draw names so everyone secretly gets one person to buy for."
                        : "Names haven't been drawn yet."}
                    </Text>
                  )}
                  {isAdmin ? (
                    <>
                      <Button
                        title={santaDrawn ? "Re-draw names" : "Draw names"}
                        variant="secondary"
                        onPress={drawSecretSanta}
                        loading={santaBusy}
                      />
                      <Pressable
                        onPress={() => router.push(`/santa-exclusions/${id}`)}
                        hitSlop={6}
                      >
                        <Text style={styles.santaLink}>Manage exclusions →</Text>
                      </Pressable>
                    </>
                  ) : null}
                </Card>
              ) : null}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No wishlists in this group yet.</Text>
        }
        renderItem={({ item }) => (
          <WishlistRow wishlist={item} currentUserId={user?.id} onOpen={onListOpen} />
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.sectionLabel}>Add your wishlist</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. My Christmas List"
              placeholderTextColor={colors.placeholder}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />
            <TextInput
              style={styles.input}
              placeholder="Occasion date (optional, YYYY-MM-DD)"
              placeholderTextColor={colors.placeholder}
              value={eventDate}
              onChangeText={setEventDate}
              autoCapitalize="none"
              maxLength={10}
            />
            <Button title="Create list" onPress={createList} loading={busy} />
          </View>
        }
      />
    </Screen>
  );
}

const WishlistRow = memo(function WishlistRow({
  wishlist,
  currentUserId,
  onOpen,
}: {
  wishlist: Wishlist;
  currentUserId?: string;
  onOpen: (id: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const mine = wishlist.owner_id === currentUserId;
  const countdown = wishlist.event_date ? formatCountdown(wishlist.event_date) : null;
  return (
    <Card style={styles.row} onPress={() => onOpen(wishlist.id)} accessibilityLabel={wishlist.title}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{wishlist.title}</Text>
        <Text style={styles.rowMeta}>
          {mine ? "Your list" : "Tap to claim gifts"}
          {countdown ? ` · 📅 ${countdown}` : ""}
        </Text>
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Card>
  );
});

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 8 },
    empty: { color: c.pageTextMuted, textAlign: "center", marginVertical: 24 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    rowTitle: { fontSize: 17, fontWeight: "600", color: c.text },
    rowMeta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    rowChevron: { fontSize: 24, color: c.textMuted },
    footer: { marginTop: 24 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: c.pageTextMuted,
      marginBottom: 8,
      textTransform: "uppercase",
    },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      marginBottom: 10,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    invite: { color: c.headerTint, fontSize: 16 },
    codeCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.accentSoft,
      padding: 16,
      marginBottom: 8,
    },
    codeLabel: { fontSize: 12, color: c.onAccentSoft, fontWeight: "600" },
    code: {
      fontSize: 24,
      fontWeight: "800",
      color: c.onAccentSoft,
      letterSpacing: 2,
      marginTop: 2,
    },
    rotate: { color: c.onAccentSoft, fontWeight: "600" },
    linkRow: { flexDirection: "row", gap: 20 },
    membersLink: { paddingVertical: 10, paddingHorizontal: 4, marginBottom: 4 },
    membersText: { color: c.accent, fontWeight: "600" },
    santaCard: { padding: 16, marginTop: 8, gap: 8 },
    santaTitle: { fontSize: 16, fontWeight: "800", color: c.text },
    santaText: { fontSize: 15, color: c.text, lineHeight: 21 },
    santaName: { fontWeight: "800", color: c.accent },
    santaLink: { color: c.accent, fontWeight: "700", textAlign: "center", paddingVertical: 4 },
  });
