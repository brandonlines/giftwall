import { Image, StyleSheet } from "react-native";

// The giftwall mark — the app icon, rounded like a home-screen badge. Used on
// the sign-in and onboarding screens so the brand carries into the app itself.
export function GiftLogo({ size = 88 }: { size?: number }) {
  return (
    <Image
      // require() (not import) keeps this CI-safe — no *.png type declaration needed.
      source={require("../../assets/images/icon.png")}
      style={[
        styles.logo,
        { width: size, height: size, borderRadius: size * 0.22 },
      ]}
      accessibilityRole="image"
      accessibilityLabel="giftwall"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    shadowColor: "#0A1A2F",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
