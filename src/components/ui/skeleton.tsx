import { useEffect, useState } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/provider";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// A single shimmering placeholder block.
export function Skeleton({
  height = 16,
  width,
  radius = 8,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pulse = useState(() => new Animated.Value(0.4))[0];

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0.7); // static, no shimmer
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion]);

  return (
    <Animated.View
      style={[
        { height, width: width ?? "100%", borderRadius: radius, backgroundColor: colors.border, opacity: pulse },
        style,
      ]}
    />
  );
}

// A card-shaped placeholder row matching the list item layout.
export function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Skeleton height={64} width={64} radius={8} />
      <View style={styles.body}>
        <Skeleton height={16} width="70%" />
        <Skeleton height={12} width="40%" />
        <Skeleton height={36} radius={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, gap: 8, justifyContent: "center" },
});
