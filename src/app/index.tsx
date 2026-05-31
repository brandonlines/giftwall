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
import { dashboardRepo, type UpcomingOccasion } from "@/data/repositories/dashboard";
import { pendingInvite } from "@/lib/pending-invite";
import { pendingSharedUrl } from "@/lib/share-intent";
import { occasionCountdown } from "@/lib/dates";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { EventType, Group } from "@/types/database";
import { EVENT_TYPES } from "@/lib/event-types";
import { t } from "@/i18n";

export default function GroupsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [occasions, setOccasions] = useState<UpcomingOccasion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState<EventType>("general");
  const [joinId, setJoinId] = useState("");
  const [busy, setBusy] = useState(false);

  const onGroupOpen = useCallback((gid: string) => router.push(`/group/${gid}`), [router]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setGroups(await groupsRepo.listMine());
      // The dashboard is a nice-to-have nudge — never block the group list on it.
      dashboardRepo.upcoming().then(setOccasions).catch(() => {});
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
      const g = await groupsRepo.create(name.trim(), eventType);
      setName("");
      setEventType("general");
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
            <View style={styles.headerLeft}>
              <Link href="/shopping" asChild>
                <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Shopping">
                  <Text style={styles.headerLink}>🛍️ Shopping</Text>
                </Pressable>
              </Link>
              <Link href="/gift-assistant" asChild>
                <Pressable hitSlop={10} accessibilityRole="button" accessibilityLabel="Gift ideas assistant">
                  <Text style={styles.headerLink}>✨ Ideas</Text>
                </Pressable>
              </Link>
            </View>
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
        ListHeaderComponent={
          groups.length > 0 ? (
            <Dashboard occasions={occasions} onSearch={() => router.push("/search")} onOpenList={(lid) => router.push(`/list/${lid}`)} />
          ) : null
        }
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
              accessibilityLabel="Group name"
            />
            <View style={styles.eventChips}>
              {EVENT_TYPES.map((e) => (
                <Pressable
                  key={e.value}
                  onPress={() => setEventType(e.value)}
                  style={[styles.eventChip, eventType === e.value && styles.eventChipOn]}
                  accessibilityRole="button"
                  accessibilityLabel={`Event type: ${e.label}`}
                  accessibilityState={{ selected: eventType === e.value }}
                >
                  <Text style={[styles.eventChipText, eventType === e.value && styles.eventChipTextOn]}>
                    {e.emoji} {e.label}
                  </Text>
                </Pressable>
              ))}
            </View>
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
              accessibilityLabel="Group invite code"
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

// Home dashboard: a search entry plus the soonest occasions across all groups,
// with a "still unclaimed" nudge for other people's lists (never your own —
// the Surprise Wall means that count is always 0 there).
function Dashboard({
  occasions,
  onSearch,
  onOpenList,
}: {
  occasions: UpcomingOccasion[];
  onSearch: () => void;
  onOpenList: (listId: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.dashboard}>
      <Card style={styles.searchRow} onPress={onSearch} accessibilityLabel="Search gifts and people">
        <Text style={styles.searchIcon} accessibilityElementsHidden importantForAccessibility="no">
          🔎
        </Text>
        <Text style={styles.searchText}>Search gifts & people</Text>
      </Card>

      {occasions.length > 0 ? (
        <View style={styles.upcoming}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Coming up
          </Text>
          {occasions.map((o) => {
            const countdown =
              occasionCountdown(o.wishlist.event_date!, o.wishlist.recurs_yearly) ?? "";
            const nudge = o.isMine
              ? "Your list"
              : o.unclaimed > 0
                ? `${o.unclaimed} gift${o.unclaimed === 1 ? "" : "s"} unclaimed`
                : "All claimed 🎉";
            return (
              <Card
                key={o.wishlist.id}
                style={styles.occasionRow}
                onPress={() => onOpenList(o.wishlist.id)}
                accessibilityLabel={`${o.wishlist.title}, ${countdown}. ${nudge}.`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.occasionTitle} numberOfLines={1}>
                    {o.wishlist.title}
                    {o.groupName ? ` · ${o.groupName}` : ""}
                  </Text>
                  <Text style={styles.occasionMeta}>
                    📅 {countdown} · {nudge}
                  </Text>
                </View>
                <Text style={styles.rowChevron} accessibilityElementsHidden importantForAccessibility="no">
                  ›
                </Text>
              </Card>
            );
          })}
        </View>
      ) : null}
    </View>
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
      <Text style={styles.rowChevron} accessibilityElementsHidden importantForAccessibility="no">
        ›
      </Text>
    </Card>
  );
});

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 8 },
    dashboard: { gap: 8, marginBottom: 8 },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
    searchIcon: { fontSize: 16 },
    searchText: { fontSize: 16, color: c.textMuted, fontWeight: "600" },
    upcoming: { gap: 8, marginTop: 4 },
    occasionRow: { flexDirection: "row", alignItems: "center", padding: 14 },
    occasionTitle: { fontSize: 16, fontWeight: "700", color: c.text },
    occasionMeta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
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
    eventChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
    eventChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.inputBorder,
      backgroundColor: c.inputBg,
    },
    eventChipOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
    eventChipText: { fontSize: 13, fontWeight: "600", color: c.pageTextMuted },
    eventChipTextOn: { color: c.onAccentSoft },
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
    headerLeft: { flexDirection: "row", gap: 16, alignItems: "center" },
  });
