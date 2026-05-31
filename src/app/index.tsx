import { memo, useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, Stack, useFocusEffect, useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Skeleton } from "@/components/ui/skeleton";
import { GiftLogo } from "@/components/gift-logo";
import { useToast } from "@/components/ui/toast";
import { groupsRepo } from "@/data/repositories/groups";
import { pendingInvite } from "@/lib/pending-invite";
import { pendingSharedUrl } from "@/lib/share-intent";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Group } from "@/types/database";
import { t } from "@/i18n";

export default function GroupsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [busy, setBusy] = useState(false);

  const onGroupOpen = useCallback((gid: string) => router.push(`/group/${gid}`), [router]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setGroups(await groupsRepo.listMine());
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load groups", "error");
    } finally {
      setRefreshing(false);
      setLoaded(true);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        // Finish a join that was started from a link before sign-in.
        const code = await pendingInvite.get();
        if (code) {
          await pendingInvite.clear();
          try {
            const groupId = await groupsRepo.joinByCode(code);
            await load();
            router.push(`/group/${groupId}`);
            return;
          } catch {
            // invalid/expired code — fall through to a normal load
          }
        }
        await load();
        // A link shared into the app from elsewhere is waiting — nudge the
        // user to open a list, where the add form will prefill it.
        if (await pendingSharedUrl.get()) {
          showToast("Shared link ready — open a list to add it", "info");
        }
      })();
    }, [load, router, showToast]),
  );

  async function createGroup() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const g = await groupsRepo.create(name.trim());
      setName("");
      router.push(`/group/${g.id}`);
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't create group", "error");
    } finally {
      setBusy(false);
    }
  }

  async function joinGroup() {
    if (!joinId.trim()) return;
    setBusy(true);
    try {
      const groupId = await groupsRepo.joinByCode(joinId.trim());
      setJoinId("");
      await load();
      router.push(`/group/${groupId}`);
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't join group", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Link href="/shopping" asChild>
              <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Shopping">
                <Text style={styles.headerLink}>🛍️ Shopping</Text>
              </Pressable>
            </Link>
          ),
          headerRight: () => (
            <Link href="/profile" asChild>
              <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel={t("common.profile")}>
                <Text style={styles.headerLink}>{t("common.profile")}</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loaded ? (
            <View style={styles.skeletons}>
              {[0, 1, 2].map((k) => (
                <Skeleton key={k} height={56} radius={12} />
              ))}
            </View>
          ) : (
            <View style={styles.hero}>
              <GiftLogo size={72} />
              <Text style={styles.heroTitle}>Welcome to giftwall</Text>
              <Text style={styles.heroHint}>
                Create your first group below, invite your family, and start sharing wishlists — surprises stay secret. 🤫
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <GroupRow group={item} onOpen={onGroupOpen} />}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.sectionLabel}>{t("groups.createSection")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("groups.namePlaceholder")}
              placeholderTextColor={colors.placeholder}
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
            <Button title={t("groups.create")} onPress={createGroup} loading={busy} />

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
              {t("groups.joinSection")}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t("groups.joinPlaceholder")}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
              value={joinId}
              onChangeText={setJoinId}
            />
            <Button
              title={t("groups.join")}
              variant="secondary"
              onPress={joinGroup}
              loading={busy}
            />
          </View>
        }
      />
    </Screen>
  );
}

const GroupRow = memo(function GroupRow({
  group,
  onOpen,
}: {
  group: Group;
  onOpen: (id: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.row} onPress={() => onOpen(group.id)} accessibilityLabel={group.name}>
      <Text style={styles.rowTitle}>{group.name}</Text>
      <Text style={styles.rowChevron}>›</Text>
    </Card>
  );
});

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 8 },
    skeletons: { gap: 8 },
    hero: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 24, gap: 12 },
    heroTitle: { fontSize: 22, fontWeight: "800", color: c.pageText },
    heroHint: { fontSize: 15, color: c.pageTextMuted, textAlign: "center", lineHeight: 22, maxWidth: 340 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
    },
    rowTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: c.text },
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
    headerLink: { color: c.accent, fontSize: 16 },
  });
