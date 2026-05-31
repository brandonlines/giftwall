import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { groupsRepo } from "@/data/repositories/groups";
import { pendingInvite } from "@/lib/pending-invite";
import { useAuth } from "@/providers/auth";
import { useTheme } from "@/theme/provider";

// Landing screen for a shared join link (giftwall://join/<CODE>). The code is
// unique to one group, so redeeming it adds the user to exactly that group —
// you can't accidentally land in the wrong one. If the opener isn't signed in
// yet, we stash the code and the auth gate sends them to sign-in; the groups
// screen finishes the join afterward.
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session, loading } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !code) return;
    let active = true;
    (async () => {
      if (!session) {
        await pendingInvite.set(code);
        return;
      }
      try {
        const groupId = await groupsRepo.joinByCode(code);
        if (active) router.replace(`/group/${groupId}`);
      } catch (e) {
        if (active) setError(String((e as Error).message));
      }
    })();
    return () => {
      active = false;
    };
  }, [code, session, loading, router]);

  return (
    <Screen>
      <Stack.Screen options={{ title: "Joining…" }} />
      <View style={styles.center}>
        {error ? (
          <Text style={{ color: colors.danger, textAlign: "center", fontSize: 16 }}>
            {error}
          </Text>
        ) : (
          <>
            <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Joining your group" />
            <Text style={{ color: colors.pageTextMuted, marginTop: 12 }}>
              Joining your group…
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
