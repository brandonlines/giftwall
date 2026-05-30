import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { profileRepo } from "@/data/repositories/profile";
import { accountRepo } from "@/data/repositories/account";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/providers/auth";
import { useTheme, useThemedStyles } from "@/theme/provider";
import { themeList, type ThemeColors } from "@/theme/themes";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme, setTheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    profileRepo
      .getMine()
      .then((p) => {
        setName(p?.display_name ?? "");
        setAvatar(p?.avatar_url ?? null);
      })
      .catch((e) => Alert.alert("Couldn't load profile", String((e as Error).message)))
      .finally(() => setLoading(false));
  }, []);

  async function changePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const url = await profileRepo.uploadAvatar(
        asset.base64!,
        asset.mimeType ?? "image/jpeg",
      );
      setAvatar(url);
    } catch (e) {
      Alert.alert("Couldn't upload photo", String((e as Error).message));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await profileRepo.setDisplayName(name.trim());
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", String((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    try {
      await accountRepo.exportData();
    } catch (e) {
      Alert.alert("Couldn't export", String((e as Error).message));
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your profile, lists, items, claims and comments. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete my account",
          style: "destructive",
          onPress: async () => {
            try {
              await accountRepo.deleteAccount();
            } catch (e) {
              Alert.alert("Couldn't delete", String((e as Error).message));
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.avatarWrap} onPress={changePhoto} disabled={uploading}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.avatarEmptyText}>📷</Text>
            </View>
          )}
          <Text style={styles.changePhoto}>
            {uploading ? "Uploading…" : "Change photo"}
          </Text>
        </Pressable>

        <Text style={styles.label}>Display name</Text>
        <Text style={styles.hint}>This is what your family sees in shared groups.</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Brandon"
          placeholderTextColor={colors.placeholder}
          value={name}
          onChangeText={setName}
          editable={!loading}
        />
        <Button title="Save" onPress={save} loading={saving} />

        <Text style={[styles.label, { marginTop: 32 }]}>Theme</Text>
        <Text style={styles.hint}>Pick the look that feels most like the season.</Text>
        <View style={styles.themeList}>
          {themeList.map((t) => {
            const selected = t.key === theme.key;
            return (
              <Card
                key={t.key}
                onPress={() => setTheme(t.key)}
                style={[styles.themeRow, selected && styles.themeRowSelected]}
              >
                <View style={styles.swatches}>
                  {[t.colors.primary, t.colors.accent, t.colors.claim, t.colors.surface].map(
                    (col, i) => (
                      <View
                        key={i}
                        style={[styles.swatch, { backgroundColor: col }]}
                      />
                    ),
                  )}
                </View>
                <View style={styles.themeMeta}>
                  <Text style={styles.themeName}>{t.name}</Text>
                  <Text style={styles.themeDesc}>{t.description}</Text>
                </View>
                {selected && <Text style={styles.check}>✓</Text>}
              </Card>
            );
          })}
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Signed in as {user?.email}</Text>
        </View>

        <View style={styles.signOutWrap}>
          <Button title="Sign out" variant="secondary" onPress={() => void signOut()} />
        </View>

        <Text style={[styles.label, { marginTop: 32 }]}>Your data</Text>
        <Text style={styles.hint}>
          Export a copy of everything tied to your account, or delete your
          account permanently.
        </Text>
        <View style={{ gap: 10 }}>
          <Button title="Export my data" variant="secondary" onPress={exportData} />
          <Button title="Delete account" variant="danger" onPress={confirmDelete} />
        </View>

        <View style={styles.legalRow}>
          <Pressable onPress={() => router.push("/legal/privacy")} hitSlop={8}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => router.push("/legal/terms")} hitSlop={8}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { padding: 24, paddingBottom: 48 },
    avatarWrap: { alignItems: "center", marginBottom: 24 },
    avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.border },
    avatarEmpty: { alignItems: "center", justifyContent: "center" },
    avatarEmptyText: { fontSize: 36 },
    changePhoto: { color: c.accent, fontWeight: "600", marginTop: 8 },
    label: { fontSize: 16, fontWeight: "700", color: c.pageText },
    hint: { color: c.pageTextMuted, marginTop: 4, marginBottom: 12 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      marginBottom: 12,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    themeList: { gap: 10 },
    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 2,
      borderColor: c.border,
      padding: 12,
    },
    themeRowSelected: { borderColor: c.accent },
    swatches: { flexDirection: "row" },
    swatch: {
      width: 18,
      height: 18,
      borderRadius: 9,
      marginLeft: -6,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.08)",
    },
    themeMeta: { flex: 1 },
    themeName: { fontSize: 15, fontWeight: "700", color: c.text },
    themeDesc: { fontSize: 12, color: c.textMuted, marginTop: 1 },
    check: { color: c.accent, fontSize: 18, fontWeight: "800" },
    meta: { marginTop: 24 },
    metaText: { color: c.pageTextMuted },
    signOutWrap: { marginTop: 24 },
    legalRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 8,
      marginTop: 28,
    },
    legalLink: { color: c.pageTextMuted, fontWeight: "600", fontSize: 13 },
    legalDot: { color: c.pageTextMuted },
  });
