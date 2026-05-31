import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { assistantRepo, type AssistantInput, type GiftIdea } from "@/data/repositories/assistant";
import { amazonSearchUrl } from "@/lib/affiliate";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

const FIELDS: { key: keyof AssistantInput; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "relationship", label: "Who's it for?", placeholder: "e.g. dad, best friend, 7-year-old niece" },
  { key: "interests", label: "What are they into?", placeholder: "fishing, cooking, sci-fi novels…", multiline: true },
  { key: "budget", label: "Budget", placeholder: "e.g. $50" },
  { key: "occasion", label: "Occasion (optional)", placeholder: "birthday, housewarming…" },
  { key: "notes", label: "Anything else? (optional)", placeholder: "owns a boat, hates clutter…", multiline: true },
];

export default function GiftAssistantScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const showToast = useToast();
  const [input, setInput] = useState<AssistantInput>({});
  const [ideas, setIdeas] = useState<GiftIdea[] | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof AssistantInput, value: string) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  async function getIdeas() {
    setLoading(true);
    try {
      const result = await assistantRepo.suggest(input);
      setIdeas(result);
      if (result.length === 0) showToast("No ideas came back — add more detail", "info");
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't get ideas", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Gift ideas" }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Tell me about the person and I&apos;ll suggest gift ideas tailored to them. ✨
        </Text>

        {FIELDS.map((f) => (
          <View key={f.key}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={[styles.input, f.multiline && styles.inputMultiline]}
              placeholder={f.placeholder}
              placeholderTextColor={colors.placeholder}
              value={input[f.key] ?? ""}
              onChangeText={(v) => set(f.key, v)}
              multiline={f.multiline}
              editable={!loading}
              accessibilityLabel={f.label}
            />
          </View>
        ))}

        <Button title="✨ Get gift ideas" onPress={getIdeas} loading={loading} />

        {ideas && ideas.length > 0 ? (
          <View style={styles.results}>
            <Text style={styles.resultsHead}>Ideas</Text>
            {ideas.map((idea, i) => (
              <Card key={i} style={styles.ideaCard}>
                <View style={styles.ideaHead}>
                  <Text style={styles.ideaTitle}>{idea.title}</Text>
                  {idea.estPrice ? <Text style={styles.ideaPrice}>{idea.estPrice}</Text> : null}
                </View>
                {idea.why ? <Text style={styles.ideaWhy}>{idea.why}</Text> : null}
                <Button
                  title="Find it on Amazon"
                  variant="secondary"
                  onPress={() => void Linking.openURL(amazonSearchUrl(idea.title))}
                />
              </Card>
            ))}
            <Text style={styles.disclaimer}>
              AI suggestions — double-check details and price before buying.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    content: { padding: 20, paddingBottom: 48, gap: 6 },
    intro: { fontSize: 15, color: c.pageTextMuted, lineHeight: 21, marginBottom: 12 },
    label: { fontSize: 15, fontWeight: "700", color: c.pageText, marginTop: 12, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    inputMultiline: { minHeight: 72, textAlignVertical: "top" },
    results: { marginTop: 28, gap: 12 },
    resultsHead: {
      fontSize: 13,
      fontWeight: "700",
      color: c.pageTextMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    ideaCard: { padding: 16, gap: 8 },
    ideaHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
    ideaTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: c.text },
    ideaPrice: { fontSize: 15, fontWeight: "700", color: c.accent },
    ideaWhy: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
    disclaimer: { fontSize: 12, color: c.pageTextMuted, textAlign: "center", marginTop: 4 },
  });
