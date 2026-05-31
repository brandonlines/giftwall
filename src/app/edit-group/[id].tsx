import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { groupsRepo } from "@/data/repositories/groups";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    groupsRepo
      .get(id)
      .then((g) => setName(g.name))
      .catch((e) => Alert.alert("Couldn't load group", String((e as Error).message)))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await groupsRepo.rename(id, name.trim());
      router.back();
    } catch (e) {
      Alert.alert("Couldn't rename", String((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete group?",
      "This removes the group and all of its wishlists, items, claims and comments for everyone. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete group",
          style: "destructive",
          onPress: async () => {
            try {
              await groupsRepo.remove(id);
              router.replace("/");
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
      <Stack.Screen options={{ title: "Edit group" }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Group name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Group name"
          placeholderTextColor={colors.placeholder}
          editable={!loading}
          maxLength={60}
          accessibilityLabel="Group name"
        />
        <Button title="Save" onPress={save} loading={saving} />

        <View style={styles.dangerZone}>
          <Text style={styles.label}>Danger zone</Text>
          <Text style={styles.hint}>
            {"Deleting the group removes everyone's lists in it permanently."}
          </Text>
          <Button title="Delete group" variant="danger" onPress={confirmDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { padding: 20 },
    label: { fontSize: 16, fontWeight: "700", color: c.pageText, marginBottom: 8 },
    hint: { color: c.pageTextMuted, marginBottom: 12 },
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
    dangerZone: { marginTop: 40 },
  });
