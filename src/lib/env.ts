// Client-side env. In Expo, only EXPO_PUBLIC_* vars are inlined into the bundle.
// The anon key is safe to ship — Row-Level Security (not key secrecy) enforces
// the Surprise Wall. Never put the service_role key in the app.

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env. Copy .env.example to .env and fill in " +
      "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
  );
}

export const env = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
} as const;
