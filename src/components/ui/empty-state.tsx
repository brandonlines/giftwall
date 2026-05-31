import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/provider";

// Friendly centered empty state: a big emoji, a title, and a hint line.
export function EmptyState({
  emoji,
  title,
  hint,
}: {
  emoji: string;
  title: string;
  hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
        {emoji}
      </Text>
      <Text style={[styles.title, { color: colors.pageText }]} accessibilityRole="header">
        {title}
      </Text>
      {hint ? <Text style={[styles.hint, { color: colors.pageTextMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 24, gap: 6 },
  emoji: { fontSize: 44, marginBottom: 4 },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  hint: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
