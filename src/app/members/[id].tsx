import { useCallback, useState } from "react";
import { Alert, type AlertButton, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { groupsRepo, type MemberWithProfile } from "@/data/repositories/groups";
import { blocksRepo } from "@/data/repositories/blocks";
import { occasionCountdown } from "@/lib/dates";
import { useAuth } from "@/providers/auth";
import { useThemedStyles } from "@/theme/provider";
import type { MemberRole } from "@/types/database";
import type { ThemeColors } from "@/theme/themes";

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);

  const isAdmin = members.some(
    (m) => m.user_id === user?.id && m.role === "admin",
  );

  const load = useCallback(async () => {
    try {
      setMembers(await groupsRepo.membersWithProfiles(id));
    } catch (e) {
      Alert.alert("Couldn't load members", String((e as Error).message));
    }
  }, [id]);

  function manageMember(member: MemberWithProfile) {
    const name = member.displayName ?? "this member";
    const buttons: AlertButton[] = [];
    if (isAdmin) {
      const makeAdminLabel = member.role === "admin" ? "Remove as admin" : "Make admin";
      const nextRole: MemberRole = member.role === "admin" ? "member" : "admin";
      buttons.push({
        text: makeAdminLabel,
        onPress: async () => {
          try {
            await groupsRepo.setMemberRole(id, member.user_id, nextRole);
            await load();
          } catch (e) {
            Alert.alert("Couldn't update role", String((e as Error).message));
          }
        },
      });
      buttons.push({
        text: "Remove from group",
        style: "destructive",
        onPress: async () => {
          try {
            await groupsRepo.removeMember(id, member.user_id);
            await load();
          } catch (e) {
            Alert.alert("Couldn't remove member", String((e as Error).message));
          }
        },
      });
    }
    // Any member can block any other — symmetric, enforced by RLS. You each stop
    // seeing the other's comments and group messages. Unblock from Profile.
    buttons.push({
      text: "Block",
      style: "destructive",
      onPress: async () => {
        try {
          await blocksRepo.block(member.user_id);
          showToast(`Blocked ${name} — you won't see their comments or messages.`, "success");
        } catch (e) {
          showToast(String((e as Error).message) || "Couldn't block", "error");
        }
      },
    });
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert(
      name,
      isAdmin ? "Manage this member or block them." : "Block this member?",
      buttons,
    );
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function confirmLeave() {
    Alert.alert("Leave group", "You'll lose access to its wishlists.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await groupsRepo.leave(id);
            router.replace("/");
          } catch (e) {
            Alert.alert("Couldn't leave", String((e as Error).message));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Members" }} />
      <FlatList
        data={members}
        keyExtractor={(m) => m.user_id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isMe = item.user_id === user?.id;
          const displayName = (item.displayName ?? "Unnamed") + (isMe ? " (You)" : "");
          const birthdayLabel = item.birthday ? occasionCountdown(item.birthday, true) : null;
          return (
            <Card
              style={styles.row}
              onPress={!isMe ? () => manageMember(item) : undefined}
              accessibilityLabel={
                !isMe
                  ? `Manage or block ${displayName}${item.role === "admin" ? ", admin" : ""}`
                  : undefined
              }
            >
              {item.avatarUrl ? (
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={styles.avatar}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              ) : (
                <View
                  style={[styles.avatar, styles.avatarEmpty]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  <Text style={styles.avatarInitial}>
                    {(item.displayName ?? "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.nameCol}>
                <Text style={styles.name}>
                  {item.displayName ?? "Unnamed"}
                  {isMe ? " (You)" : ""}
                </Text>
                {item.shippingAddress ? (
                  <Text style={styles.address} numberOfLines={2}>
                    📦 {item.shippingAddress}
                  </Text>
                ) : null}
                {birthdayLabel ? (
                  <Text style={styles.birthday}>🎂 Birthday {birthdayLabel}</Text>
                ) : null}
              </View>
              {item.role === "admin" && (
                <Text style={styles.adminTag} maxFontSizeMultiplier={1.4}>Admin</Text>
              )}
              {!isMe && (
                <Text style={styles.manage} accessibilityElementsHidden importantForAccessibility="no">
                  ›
                </Text>
              )}
            </Card>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <Button title="Leave group" variant="danger" onPress={confirmLeave} />
          </View>
        }
      />
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 8 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.border },
    avatarEmpty: { alignItems: "center", justifyContent: "center" },
    avatarInitial: { fontSize: 18, fontWeight: "700", color: c.textMuted },
    nameCol: { flex: 1 },
    name: { fontSize: 16, fontWeight: "600", color: c.text },
    address: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    birthday: { fontSize: 13, color: c.accent, fontWeight: "600", marginTop: 2 },
    adminTag: {
      fontSize: 12,
      fontWeight: "700",
      color: c.onAccentSoft,
      backgroundColor: c.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      overflow: "hidden",
    },
    manage: { fontSize: 22, color: c.textMuted, marginLeft: 4 },
    footer: { marginTop: 24 },
  });
