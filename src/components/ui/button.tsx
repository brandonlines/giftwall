import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/theme/provider";

type Props = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : colors.surface;
  const fg =
    variant === "primary"
      ? colors.onPrimary
      : variant === "danger"
        ? colors.onDanger
        : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: colors.border,
          borderWidth: variant === "secondary" ? 1 : 0,
        },
        (pressed || isDisabled) && styles.dim,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        // Cap scaling so very large system text can't clip the fixed-height
        // button, while still honouring most of the Dynamic Type range.
        <Text style={[styles.label, { color: fg }]} maxFontSizeMultiplier={1.6} numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  dim: { opacity: 0.6 },
  label: { fontSize: 16, fontWeight: "600" },
});
