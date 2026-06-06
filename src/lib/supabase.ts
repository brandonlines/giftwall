import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import type { Database } from "../types/database";

export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Native returns OAuth / magic-link via a deep link handled by
      // expo-router, so URL session detection stays off there. On web there is
      // no deep link — the session comes back in the page URL (?code=… on the
      // PKCE redirect), so supabase-js must parse it to finish sign-in.
      detectSessionInUrl: Platform.OS === "web",
      // PKCE so the OAuth (Google) redirect returns a code we exchange manually.
      flowType: "pkce",
    },
  },
);

// Reads the current user id from the locally-cached session (no network), so
// it still works offline — unlike auth.getUser(), which round-trips to the server.
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

// Pause/resume token auto-refresh with app foreground state, per Supabase RN guidance.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
