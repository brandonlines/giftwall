import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

// Frictionless onboarding for a family/friends launch: email magic link / OTP,
// plus native Sign in with Apple and Google OAuth. Apple requires that if you
// offer any third-party sign-in on iOS, you also offer Apple — both are wired.

// Where OAuth redirects land. Add this exact URL to Supabase Auth > URL
// Configuration > Redirect URLs (it resolves to e.g. giftwall://auth-callback).
const redirectTo = Linking.createURL("/auth-callback");

// --- Email OTP -------------------------------------------------------------

export async function signInWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

// Verifies the 6-digit code from the email (the no-deep-link path).
export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) throw error;
  return data.session;
}

// --- Sign in with Apple (native, iOS only) ---------------------------------

export const isAppleSignInAvailable = Platform.OS === "ios";

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error("Apple sign-in returned no identity token");
  }
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
  });
  if (error) throw error;
}

// --- Google (OAuth via in-app browser + PKCE code exchange) ----------------

async function exchangeCodeFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;
  const errorDescription = queryParams?.error_description;
  if (typeof errorDescription === "string") throw new Error(errorDescription);
  if (typeof code === "string") {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }
}

export async function signInWithGoogle() {
  // Web: there's no in-app browser. Do a normal full-page OAuth redirect and let
  // supabase-js finish the PKCE exchange when Google sends us back — that's what
  // `detectSessionInUrl` (enabled for web in lib/supabase.ts) is for.
  if (Platform.OS === "web") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: Linking.createURL("/") },
    });
    if (error) throw error;
    return;
  }

  // Native: open the system browser and exchange the returned code ourselves.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error("No OAuth URL returned");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === "success") {
    await exchangeCodeFromUrl(result.url);
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
