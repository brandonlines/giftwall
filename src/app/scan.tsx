import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useToast } from "@/components/ui/toast";
import { useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

// Scan a product barcode to start an add-item. CameraView only mounts on
// native; on web (and the export bundle) we show a "use the app" message so the
// build stays green. Real scanning needs a device dev build.
export default function ScanScreen() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

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
                showToast(`Scanned: ${result.data}`, "success");
                router.back();
              }
        }
      />
      <View style={styles.hintBar}>
        <Text style={styles.hintText}>Point the camera at a barcode</Text>
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
    hintText: { color: "#fff", fontWeight: "600" },
  });
