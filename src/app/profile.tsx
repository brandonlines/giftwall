import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
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
import {
  notificationsRepo,
  type NotificationSettings,
} from "@/data/repositories/notifications";
import { accountRepo } from "@/data/repositories/account";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { isValidDateStr } from "@/lib/dates";
import { profileShareMessage, profileUrl } from "@/lib/links";
import { isValidUsername, normalizeUsername } from "@/lib/validation";
import { signOut } from "@/lib/auth";
import type { Wishlist } from "@/types/database";
import { useAuth } from "@/providers/auth";
import { useTheme, useThemedStyles } from "@/theme/provider";
import { themeList, type ThemeColors } from "@/theme/themes";
import { useAppIcon } from "@/icon/provider";
import { ICON_PREVIEWS } from "@/icon/previews";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme, setTheme } = useTheme();
  const { iconKey, setAppIcon } = useAppIcon();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [birthday, setBirthday] = useState("");
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [myLists, setMyLists] = useState<Wishlist[]>([]);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [prefs, setPrefs] = useState<NotificationSettings>({
    new_item: true,
    new_comment: true,
    occasion_reminder: true,
  });

  useEffect(() => {
    Promise.all([profileRepo.getMine(), notificationsRepo.getMine(), wishlistsRepo.mine()])
      .then(([p, n, lists]) => {
        setName(p?.display_name ?? "");
        setAddress(p?.shipping_address ?? "");
        setBirthday(p?.birthday ?? "");
        setUsername(p?.username ?? "");
        setSavedUsername(p?.username ?? "");
        setAvatar(p?.avatar_url ?? null);
        setPrefs(n);
        setMyLists(lists);
      })
      .catch((e) => Alert.alert("Couldn't load profile", String((e as Error).message)))
      .finally(() => setLoading(false));
  }, []);

  // Toggles persist immediately (optimistic), reverting on failure.
  function togglePref(key: keyof NotificationSettings, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }));
    notificationsRepo.update({ [key]: value }).catch((e) => {
      Alert.alert("Couldn't save", String((e as Error).message));
      setPrefs((p) => ({ ...p, [key]: !value }));
    });
  }

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
    const trimmedBday = birthday.trim();
    if (trimmedBday && !isValidDateStr(trimmedBday)) {
      Alert.alert("Check your birthday", "Use a date like 1990-07-23 (year-month-day).");
      return;
    }
    const handle = normalizeUsername(username);
    if (username.trim() && !isValidUsername(handle)) {
      Alert.alert("Check your handle", "Use 3–30 letters, numbers or underscores.");
      return;
    }
    setSaving(true);
    try {
      await profileRepo.setDisplayName(name.trim());
      await profileRepo.setShippingAddress(address);
      await profileRepo.setBirthday(trimmedBday || null);
      await profileRepo.setUsername(handle || null);
      setSavedUsername(handle);
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", String((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  // Public-list visibility persists immediately (optimistic), reverting on error.
  function toggleListPublic(list: Wishlist, value: boolean) {
    setMyLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, is_public: value } : l)));
    wishlistsRepo.setPublic(list.id, value).catch((e) => {
      Alert.alert("Couldn't update", String((e as Error).message));
      setMyLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, is_public: !value } : l)));
    });
  }

  async function shareProfile() {
    if (!savedUsername) return;
    try {
      await Share.share({ message: profileShareMessage(savedUsername) });
    } catch {
      // user dismissed the share sheet
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
        <Pressable
          style={styles.avatarWrap}
          onPress={changePhoto}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel={avatar ? "Change profile photo" : "Add a profile photo"}
          accessibilityState={{ busy: uploading, disabled: uploading }}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} accessibilityLabel="Your profile photo" />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.avatarEmptyText} accessibilityElementsHidden importantForAccessibility="no">
                📷
              </Text>
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
          accessibilityLabel="Display name"
        />

        <Text style={[styles.label, { marginTop: 20 }]}>Shipping address</Text>
        <Text style={styles.hint}>
          Optional. Shown to people in your groups so they can send gifts — leave
          blank to keep it private.
        </Text>
        <TextInput
          style={[styles.input, styles.addressInput]}
          placeholder="Street, city, postal/zip code"
          placeholderTextColor={colors.placeholder}
          value={address}
          onChangeText={setAddress}
          editable={!loading}
          multiline
          numberOfLines={3}
          accessibilityLabel="Shipping address"
        />

        <Text style={[styles.label, { marginTop: 20 }]}>Birthday</Text>
        <Text style={styles.hint}>
          Optional. Your groups get a friendly heads-up as it approaches — you
          won&apos;t be reminded about your own.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.placeholder}
          value={birthday}
          onChangeText={setBirthday}
          editable={!loading}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Birthday, format year-month-day"
        />
        <Button title="Save" onPress={save} loading={saving} />

        <Text style={[styles.label, { marginTop: 32 }]}>Public profile</Text>
        <Text style={styles.hint}>
          Claim a handle for one shareable link to every list you mark public.
          Visitors see your gift ideas — never who already claimed them.
        </Text>
        <View style={styles.handleRow}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.handleInput}
            placeholder="yourname"
            placeholderTextColor={colors.placeholder}
            value={username}
            onChangeText={setUsername}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Public profile handle"
          />
        </View>
        {savedUsername ? (
          <View style={styles.shareRow}>
            <Text style={styles.urlPreview} numberOfLines={1}>
              {profileUrl(savedUsername)}
            </Text>
            <Button title="Share" variant="secondary" onPress={shareProfile} />
          </View>
        ) : (
          <Text style={styles.hintSmall}>Save a handle to get your shareable link.</Text>
        )}
        {myLists.length > 0 ? (
          <Card style={styles.publicLists}>
            {myLists.map((l, i) => (
              <View key={l.id} style={[styles.publicRow, i > 0 && styles.prefRowBorder]}>
                <Text style={styles.publicTitle} numberOfLines={1}>
                  {l.title}
                </Text>
                <Switch
                  value={l.is_public}
                  onValueChange={(v) => toggleListPublic(l, v)}
                  disabled={loading}
                  accessibilityLabel={`Show ${l.title} on your public profile`}
                />
              </View>
            ))}
          </Card>
        ) : (
          <Text style={styles.hintSmall}>Lists you create will appear here to share publicly.</Text>
        )}

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
                accessibilityLabel={`${t.name} theme. ${t.description}`}
                accessibilityState={{ selected }}
              >
                <View style={styles.swatches} accessibilityElementsHidden importantForAccessibility="no">
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
                {selected && (
                  <Text style={styles.check} accessibilityElementsHidden importantForAccessibility="no">
                    ✓
                  </Text>
                )}
              </Card>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: 32 }]}>App icon</Text>
        <Text style={styles.hint}>
          {Platform.OS === "ios"
            ? "Choose your home-screen icon — iOS shows a quick confirmation when it changes."
            : "Choose your home-screen icon — on Android it updates after you leave the app."}
        </Text>
        <View style={styles.themeList}>
          {themeList.map((t) => {
            const selected = t.key === iconKey;
            return (
              <Card
                key={t.key}
                onPress={() => setAppIcon(t.key)}
                style={[styles.themeRow, selected && styles.themeRowSelected]}
                accessibilityLabel={`${t.name} app icon`}
                accessibilityState={{ selected }}
              >
                <Image
                  source={ICON_PREVIEWS[t.key]}
                  style={styles.iconThumb}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <View style={styles.themeMeta}>
                  <Text style={styles.themeName}>{t.name}</Text>
                  <Text style={styles.themeDesc}>{t.description}</Text>
                </View>
                {selected && (
                  <Text style={styles.check} accessibilityElementsHidden importantForAccessibility="no">
                    ✓
                  </Text>
                )}
              </Card>
            );
          })}
        </View>

        <Text style={[styles.label, { marginTop: 32 }]}>Notifications</Text>
        <Text style={styles.hint}>Choose which push notifications you get.</Text>
        <Card style={styles.prefList}>
          {(
            [
              ["new_item", "New gift ideas"],
              ["new_comment", "New comments"],
              ["occasion_reminder", "Occasion reminders"],
            ] as const
          ).map(([key, label], i) => (
            <View key={key} style={[styles.prefRow, i > 0 && styles.prefRowBorder]}>
              <Text style={styles.prefLabel}>{label}</Text>
              <Switch
                value={prefs[key]}
                onValueChange={(v) => togglePref(key, v)}
                disabled={loading}
                accessibilityLabel={label}
              />
            </View>
          ))}
        </Card>

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
          <Pressable
            onPress={() => router.push("/legal/privacy")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open Privacy Policy"
          >
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.legalDot} accessibilityElementsHidden importantForAccessibility="no">
            ·
          </Text>
          <Pressable
            onPress={() => router.push("/legal/terms")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open Terms of Service"
          >
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
    addressInput: { minHeight: 76, textAlignVertical: "top" },
    hintSmall: { color: c.pageTextMuted, fontSize: 13, marginBottom: 12 },
    handleRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingLeft: 14,
      marginBottom: 10,
      backgroundColor: c.inputBg,
    },
    atSign: { fontSize: 16, fontWeight: "700", color: c.pageTextMuted },
    handleInput: { flex: 1, padding: 14, paddingLeft: 4, fontSize: 16, color: c.inputText },
    shareRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    urlPreview: { flex: 1, color: c.accent, fontSize: 13, fontWeight: "600" },
    publicLists: { paddingVertical: 4, paddingHorizontal: 8, marginBottom: 4 },
    publicRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 8,
      gap: 12,
    },
    publicTitle: { fontSize: 15, color: c.text, flex: 1 },
    prefList: { paddingVertical: 4, paddingHorizontal: 8 },
    prefRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    prefRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    prefLabel: { fontSize: 15, color: c.text, flex: 1 },
    themeList: { gap: 10 },
    iconThumb: { width: 44, height: 44, borderRadius: 10 },
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
