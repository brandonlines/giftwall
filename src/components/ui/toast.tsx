import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/provider";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import * as haptics from "@/lib/haptics";

type ToastKind = "info" | "error" | "success";
type ToastState = { message: string; kind: ToastKind } | null;

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(
  () => {},
);

// Lightweight transient banner for non-critical feedback (load failures, "saved",
// etc.). Destructive confirmations still use Alert; this is for things that
// shouldn't interrupt with a modal.
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useState(() => new Animated.Value(0))[0];
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ message, kind });
      // Tactile echo of the banner — success/error are worth feeling, info isn't.
      if (kind === "success") haptics.success();
      else if (kind === "error") haptics.error();
      if (reducedMotion) opacity.setValue(1);
      else Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        if (reducedMotion) {
          opacity.setValue(0);
          setToast(null);
        } else {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start(() => setToast(null));
        }
      }, 3000);
    },
    [opacity, reducedMotion],
  );

  const bg =
    toast?.kind === "error"
      ? colors.danger
      : toast?.kind === "success"
        ? colors.claimMine
        : colors.primary;
  const fg =
    toast?.kind === "error"
      ? colors.onDanger
      : toast?.kind === "success"
        ? colors.onClaimMine
        : colors.onPrimary;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { backgroundColor: bg, bottom: insets.bottom + 24, opacity },
          ]}
        >
          <Text style={[styles.text, { color: fg }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  text: { fontSize: 15, fontWeight: "600", textAlign: "center" },
});
