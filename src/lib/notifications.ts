import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase, currentUserId } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registers this device's Expo push token against the signed-in user so the
// send-push Edge Function can notify them. No-ops on simulators (no token) and
// when permission is denied. Safe to call on every login.
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return; // set after `eas init`

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const uid = await currentUserId();
  await supabase
    .from("push_tokens")
    .upsert(
      { user_id: uid, token, platform: Platform.OS },
      { onConflict: "token" },
    );
}
