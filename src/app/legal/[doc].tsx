import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import { LAST_UPDATED, PRIVACY, TERMS } from "@/legal/content";

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const styles = useThemedStyles(makeStyles);
  const isTerms = doc === "terms";
  const sections = isTerms ? TERMS : PRIVACY;
  const title = isTerms ? "Terms of Service" : "Privacy Policy";

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.updated}>Last updated {LAST_UPDATED}</Text>
        {sections.map((s) => (
          <View key={s.title}>
            <Text style={styles.section}>{s.title}</Text>
            {s.body.map((p, j) => (
              <Text key={j} style={styles.body}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    heading: { fontSize: 26, fontWeight: "800", color: c.pageText },
    updated: { fontSize: 13, color: c.pageTextMuted, marginTop: 4, marginBottom: 16 },
    section: { fontSize: 16, fontWeight: "700", color: c.pageText, marginTop: 18, marginBottom: 6 },
    body: { fontSize: 15, color: c.pageText, lineHeight: 21, marginBottom: 8 },
  });
