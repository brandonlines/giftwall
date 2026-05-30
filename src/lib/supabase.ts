import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
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
      // No URL-based session detection on native; OAuth/magic-link returns
      // via deep link handled by expo-router.
      detectSessionInUrl: false,
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
