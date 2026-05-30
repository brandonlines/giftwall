import AsyncStorage from "@react-native-async-storage/async-storage";

// Holds a URL shared into giftwall from another app (via the OS share sheet)
// until the user picks a list to drop it on. The native capture side is wired
// with expo-share-intent on a dev build (see README "Share extension"); this
// module is the app-side handoff and works without it (e.g. for testing).
const KEY = "giftwall.pendingSharedUrl";

export const pendingSharedUrl = {
  get: () => AsyncStorage.getItem(KEY),
  set: (url: string) => AsyncStorage.setItem(KEY, url),
  clear: () => AsyncStorage.removeItem(KEY),
};
