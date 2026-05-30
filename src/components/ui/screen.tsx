import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/theme/provider";

// Themed root container. Renders the palette's gradient natively when one is
// defined (Northern Lights), otherwise a solid background. Children sit on top
// with a transparent background.
export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  // Background fills the device; content is constrained + centered so it stays
  // readable on iPad / landscape / wide web instead of stretching edge-to-edge.
  const content = <View style={styles.content}>{children}</View>;

  if (colors.backgroundGradient) {
    return (
      <LinearGradient
        colors={colors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fill, style]}
      >
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
});
