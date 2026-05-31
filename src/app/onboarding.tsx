import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { GiftLogo } from "@/components/gift-logo";
import { onboardingSeen } from "@/lib/onboarding";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

const CARDS = [
  {
    emoji: "🎁",
    title: "Wishlists for the people you love",
    body: "Make a group with your family or friends, share lists, and coordinate gifts in one place.",
  },
  {
    emoji: "🤫",
    title: "The Surprise Wall",
    body: "You can never see who claimed or bought items on your own list — and they can never spoil the surprise. It's enforced by the database, not just hidden.",
  },
  {
    emoji: "✨",
    title: "Claim together, gift better",
    body: "Add items by pasting a link, claim what you'll buy so no one doubles up, and check things off as you shop.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const [index, setIndex] = useState(0);
  const last = index === CARDS.length - 1;
  const card = CARDS[index];

  async function finish() {
    await onboardingSeen.set();
    router.replace("/sign-in");
  }

  function next() {
    if (last) void finish();
    else setIndex((i) => i + 1);
  }

  return (
    <Screen>
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <GiftLogo size={30} />
            <Text style={styles.wordmark}>giftwall</Text>
          </View>
          <Pressable onPress={finish} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip intro">
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
            {card.emoji}
          </Text>
          <Text style={styles.title} accessibilityRole="header">{card.title}</Text>
          <Text style={styles.text}>{card.body}</Text>
        </View>

        <View style={styles.footer}>
          <View
            style={styles.dots}
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${index + 1} of ${CARDS.length}`}
          >
            {CARDS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            ))}
          </View>
          <Button title={last ? "Get started" : "Next"} onPress={next} />
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, padding: 24 },
    top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 32 },
    brand: { flexDirection: "row", alignItems: "center", gap: 8 },
    wordmark: { fontSize: 18, fontWeight: "800", color: c.pageText },
    skip: { color: c.pageTextMuted, fontSize: 16, fontWeight: "600" },
    body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
    emoji: { fontSize: 72 },
    title: { fontSize: 26, fontWeight: "800", color: c.pageText, textAlign: "center" },
    text: { fontSize: 16, color: c.pageTextMuted, textAlign: "center", lineHeight: 23, maxWidth: 360 },
    footer: { gap: 20 },
    dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
    dotActive: { backgroundColor: c.accent, width: 22 },
  });
