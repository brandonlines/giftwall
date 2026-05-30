import { useCallback, useState } from "react";
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
import { groupsRepo } from "@/data/repositories/groups";
import { wishlistsRepo } from "@/data/repositories/wishlists";
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
  const [busy, setBusy] = useState(false);

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

  async function createList() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await wishlistsRepo.create(id, title.trim());
      setTitle("");
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
              <Card style={styles.codeCard} onPress={shareInvite}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeLabel}>Invite code · tap to share</Text>
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
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No wishlists in this group yet.</Text>
        }
        renderItem={({ item }) => {
          const mine = item.owner_id === user?.id;
          return (
            <Card style={styles.row} onPress={() => router.push(`/list/${item.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>
                  {mine ? "Your list" : "Tap to claim gifts"}
                </Text>
              </View>
              <Text style={styles.rowChevron}>›</Text>
            </Card>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.sectionLabel}>Add your wishlist</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. My Christmas List"
              placeholderTextColor={colors.placeholder}
              value={title}
              onChangeText={setTitle}
            />
            <Button title="Create list" onPress={createList} loading={busy} />
          </View>
        }
      />
    </Screen>
  );
}

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
  });
