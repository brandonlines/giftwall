import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { ItemForm } from "@/components/item-form";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { useTheme } from "@/theme/provider";
import type { Item } from "@/types/database";

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    wishlistsRepo
      .getItem(id)
      .then(setItem)
      .catch((e) => Alert.alert("Couldn't load item", String((e as Error).message)));
  }, [id]);

  return (
    <Screen>
      <Stack.Screen options={{ title: "Edit item" }} />
      <ScrollView contentContainerStyle={styles.container}>
        {item ? (
          <ItemForm
            initial={item}
            submitLabel="Save changes"
            onSubmit={async (v) => {
              try {
                await wishlistsRepo.updateItem(id, v);
                router.back();
              } catch (e) {
                Alert.alert("Couldn't save", String((e as Error).message));
              }
            }}
          />
        ) : (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
});
