import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/providers/auth";
import { ThemeProvider, useTheme } from "@/theme/provider";
import { ToastProvider } from "@/components/ui/toast";
import { initMonitoring } from "@/lib/monitoring";

// Start crash reporting before anything renders (no-ops without a DSN).
initMonitoring();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // /preview is a public design gallery; /sign-in is the auth screen.
    const publicRoute = segments[0] === "sign-in" || segments[0] === "preview";
    if (!session && !publicRoute) {
      router.replace("/sign-in");
    } else if (session && segments[0] === "sign-in") {
      router.replace("/");
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerTint,
          headerTitleStyle: { color: colors.headerTint },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="preview" options={{ title: "Theme Preview" }} />
        <Stack.Screen name="index" options={{ title: "Your Groups" }} />
        <Stack.Screen name="group/[id]" options={{ title: "Group" }} />
        <Stack.Screen name="list/[id]" options={{ title: "Wishlist" }} />
        <Stack.Screen name="members/[id]" options={{ title: "Members" }} />
        <Stack.Screen name="activity/[id]" options={{ title: "Activity" }} />
        <Stack.Screen name="item-comments/[id]" options={{ title: "Discussion" }} />
        <Stack.Screen name="legal/[doc]" options={{ title: "Legal" }} />
        <Stack.Screen
          name="edit-group/[id]"
          options={{ title: "Edit group", presentation: "modal" }}
        />
        <Stack.Screen name="join/[code]" options={{ title: "Joining…" }} />
        <Stack.Screen
          name="edit-item/[id]"
          options={{ title: "Edit item", presentation: "modal" }}
        />
        <Stack.Screen
          name="profile"
          options={{ title: "Profile", presentation: "modal" }}
        />
      </Stack>
    </>
  );
}
