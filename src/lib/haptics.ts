import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// One place for tactile feedback. Every call is fire-and-forget and a no-op on
// web (where the haptics native module rejects), so callers never need to guard
// Platform or await. `showToast` routes success/error through here, so most of
// the app gets feedback for free; use `tap` directly for discrete touches
// (claim button, reactions) that don't raise a toast.

const ok = Platform.OS !== "web";

/** A light tap for a discrete, successful touch (claim, react, select). */
export function tap(): void {
  if (ok) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** A positive notification buzz for a completed action (saved, sent, joined). */
export function success(): void {
  if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** A cautionary buzz for a reversible/destructive confirm. */
export function warning(): void {
  if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

/** A failure buzz for an error the user should notice. */
export function error(): void {
  if (ok) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
