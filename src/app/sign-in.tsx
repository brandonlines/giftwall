import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { GiftLogo } from "@/components/gift-logo";
import {
  isAppleSignInAvailable,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  verifyEmailOtp,
} from "@/lib/auth";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import { t } from "@/i18n";

export default function SignInScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await signInWithEmail(email.trim());
      setStage("code");
    } catch (e) {
      Alert.alert("Couldn't send code", String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    setBusy(true);
    try {
      await verifyEmailOtp(email.trim(), code.trim());
    } catch (e) {
      Alert.alert("Invalid code", String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function withApple() {
    try {
      await signInWithApple();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (err.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert("Apple sign-in failed", String(err.message));
    }
  }

  async function withGoogle() {
    try {
      await signInWithGoogle();
    } catch (e) {
      Alert.alert("Google sign-in failed", String((e as Error).message));
    }
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.container}
        >
          <View style={styles.header}>
            <GiftLogo size={84} />
            <Text style={styles.title}>giftwall</Text>
            <Text style={styles.subtitle}>{t("signin.subtitle")}</Text>
          </View>

          {stage === "email" ? (
            <>
              <TextInput
                style={styles.input}
                placeholder={t("signin.emailPlaceholder")}
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                accessibilityLabel="Email address"
              />
              <Button title={t("signin.sendCode")} onPress={sendCode} loading={busy} />
            </>
          ) : (
            <>
              <Text style={styles.hint}>{t("signin.codeHint", { email })}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("signin.codePlaceholder")}
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                accessibilityLabel="Verification code"
              />
              <Button title={t("signin.verify")} onPress={confirmCode} loading={busy} />
              <Button
                title={t("signin.differentEmail")}
                variant="secondary"
                onPress={() => setStage("email")}
              />
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.or}>{t("signin.or")}</Text>
            <View style={styles.line} />
          </View>

          {isAppleSignInAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                colors.statusBar === "light"
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={12}
              style={styles.apple}
              onPress={withApple}
            />
          )}
          <Button title={t("signin.google")} variant="secondary" onPress={withGoogle} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: "transparent" },
    container: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
    header: { marginBottom: 24, alignItems: "center", gap: 12 },
    title: { fontSize: 36, fontWeight: "800", color: c.pageText },
    subtitle: { fontSize: 16, color: c.pageTextMuted, textAlign: "center" },
    hint: { color: c.pageText, marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    divider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
    line: { flex: 1, height: 1, backgroundColor: c.border },
    or: { marginHorizontal: 12, color: c.pageTextMuted },
    apple: { height: 50, marginBottom: 12 },
  });
