import AsyncStorage from "@react-native-async-storage/async-storage";

// Holds an invite code captured from a join link that was opened before the
// user was signed in. The groups screen redeems it once a session exists.
const KEY = "giftwall.pendingInvite";

export const pendingInvite = {
  set: (code: string) => AsyncStorage.setItem(KEY, code),
  get: () => AsyncStorage.getItem(KEY),
  clear: () => AsyncStorage.removeItem(KEY),
};
