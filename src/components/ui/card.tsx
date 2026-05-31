import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme/provider";

// A surface that sits above the screen background. In glass themes (Northern
// Lights) it renders a real background blur behind its content; otherwise a
// solid surface fill. Pass `onPress` to make the whole card tappable.
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  accessibilityState,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
}) {
  const { colors } = useTheme();

  const base: ViewStyle = {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.glass ? "transparent" : colors.surface,
  };

  const body = colors.glass ? (
    <>
      <BlurView
        intensity={45}
        tint="light"
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.35)" }]}
      />
      {children}
    </>
  ) : (
    children
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        style={({ pressed }) => [base, style, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={[base, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
});
