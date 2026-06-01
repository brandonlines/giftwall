import { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { barcodeRepo } from "@/data/repositories/barcode";
import { scrapeRepo } from "@/data/repositories/scrape";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

// Scan a product barcode (or a QR that encodes a product URL) to add an item.
// CameraView only mounts on native; on web we show a "use the app" message so
// the export bundle stays green. Real scanning needs a device — the Simulator
// has no camera.
export default function ScanScreen() {
  const router = useRouter();
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleScan(data: string) {
    setBusy(true);
    try {
      const raw = data.trim();
      let product: { title: string; imageUrl: string | null; url: string | null } | null = null;

      if (/^https?:\/\//i.test(raw)) {
        // QR codes often encode a product page — scrape it like a pasted link.
        const p = await scrapeRepo.fromUrl(raw);
        if (p.title || p.image) product = { title: p.title ?? raw, imageUrl: p.image, url: raw };
      } else {
        const p = await barcodeRepo.lookup(raw);
        if (p) product = { title: p.title, imageUrl: p.imageUrl, url: null };
      }

      if (!product?.title) {
        showToast("Couldn't identify that — add it by name instead", "info");
        router.back();
        return;
      }
      if (listId) {
        await wishlistsRepo.addItem(listId, {
          title: product.title,
          image_url: product.imageUrl,
          url: product.url,
        });
        showToast(`Added ${product.title} 🎁`, "success");
      } else {
        showToast(`Scanned ${product.title}`, "success");
      }
      router.back();
    } catch (e) {
      showToast(String((e as Error).message) || "Scan failed", "error");
      router.back();
    }
  }

  function info(emoji: string, title: string, body: string, action?: React.ReactNode) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Scan a barcode" }} />
        <View style={styles.center}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {action}
        </View>
      </Screen>
    );
  }

  if (Platform.OS === "web") {
    return info(
      "📷",
      "Scanning needs the app",
      "Open giftwall on your phone to scan a product barcode in-store.",
      <Button title="Go back" variant="secondary" onPress={() => router.back()} />,
    );
  }

  if (!permission) return info("📷", "Checking camera…", "One moment.");

  if (!permission.granted) {
    return info(
      "📷",
      "Camera access needed",
      "Allow the camera so you can scan product barcodes.",
      <Button title="Allow camera" onPress={() => void requestPermission()} />,
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Scan a barcode" }} />
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr"] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : (result) => {
                setScanned(true);
                void handleScan(result.data);
              }
        }
      />
      <View style={styles.hintBar}>
        {busy ? (
          <View style={styles.hintRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.hintText}>Looking up product…</Text>
          </View>
        ) : (
          <Text style={styles.hintText}>Point the camera at a barcode</Text>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
    emoji: { fontSize: 56 },
    title: { fontSize: 22, fontWeight: "800", color: c.pageText, textAlign: "center" },
    body: { fontSize: 15, color: c.pageTextMuted, textAlign: "center", maxWidth: 300, marginBottom: 8 },
    hintBar: {
      position: "absolute",
      bottom: 48,
      alignSelf: "center",
      backgroundColor: "rgba(0,0,0,0.6)",
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 12,
    },
    hintRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    hintText: { color: "#fff", fontWeight: "600" },
  });
