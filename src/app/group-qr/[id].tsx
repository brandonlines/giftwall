import { useEffect, useState } from "react";
import { ActivityIndicator, Share, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { inviteMessage, inviteUrl } from "@/lib/links";
import { groupsRepo } from "@/data/repositories/groups";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Group } from "@/types/database";

export default function GroupQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    groupsRepo.get(id).then(setGroup).catch(() => {});
  }, [id]);

  const url = group ? inviteUrl(group.invite_code) : "";

  function share() {
    if (!group) return;
    void Share.share({ message: inviteMessage(group.name, group.invite_code) });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Invite" }} />
      <View style={styles.center}>
        {!group ? (
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading invite" />
        ) : (
          <>
            <Text style={styles.heading} accessibilityRole="header">Scan to join</Text>
            <Text style={styles.sub}>{group.name}</Text>
            <View
              style={styles.qrCard}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`QR code to join "${group.name}". Or enter code ${group.invite_code}.`}
            >
              <QRCode
                value={url}
                size={220}
                color={colors.text}
                backgroundColor="transparent"
              />
            </View>
            <Text style={styles.code} maxFontSizeMultiplier={1.4}>{group.invite_code}</Text>
            <Text style={styles.hint}>
              Family can point their camera at this to join — or use the code.
            </Text>
            <View style={styles.actions}>
              <Button title="Share link instead" variant="secondary" onPress={share} />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
    heading: { fontSize: 24, fontWeight: "800", color: c.pageText },
    sub: { fontSize: 16, color: c.pageTextMuted, marginBottom: 8 },
    qrCard: {
      backgroundColor: c.surface,
      padding: 24,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    code: {
      fontSize: 28,
      fontWeight: "800",
      color: c.accent,
      letterSpacing: 3,
      marginTop: 8,
    },
    hint: { fontSize: 14, color: c.pageTextMuted, textAlign: "center", maxWidth: 300 },
    actions: { alignSelf: "stretch", marginTop: 12 },
  });
