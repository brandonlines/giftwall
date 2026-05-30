import AsyncStorage from "@react-native-async-storage/async-storage";

// Whether the user has seen the first-run intro. Stored locally so onboarding
// shows once, before sign-in.
const KEY = "giftwall.onboardingSeen.v1";

export const onboardingSeen = {
  async get(): Promise<boolean> {
    return (await AsyncStorage.getItem(KEY)) === "1";
  },
  set(): Promise<void> {
    return AsyncStorage.setItem(KEY, "1");
  },
};
