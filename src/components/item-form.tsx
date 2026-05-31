import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/ui/button";
import { scrapeRepo } from "@/data/repositories/scrape";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { clampLen, clampQuantity, parsePriceToCents, LIMITS } from "@/lib/validation";
import { firstUrl, splitUrls } from "@/lib/urls";
import { pendingSharedUrl } from "@/lib/share-intent";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Item } from "@/types/database";

export type ItemFormValue = {
  title: string;
  url: string | null;
  image_url: string | null; // cover (= images[0]); kept for back-compat readers
  images: string[];
  price_cents: number | null;
  currency: string | null;
  note: string | null;
  quantity: number;
  is_priority: boolean;
  is_group_gift: boolean;
};

// An item's photos: prefer the new `images` array, falling back to the single
// legacy `image_url` so items created before multi-photo still show their cover.
function initialImages(initial?: Partial<Item>): string[] {
  if (initial?.images && initial.images.length > 0) return initial.images;
  return initial?.image_url ? [initial.image_url] : [];
}

// Shared form for creating and editing an item. Handles link scraping and
// surfaces title / price / quantity / note. Returns a fully-built value object
// (including image_url + currency carried from the scrape or the initial item).
export function ItemForm({
  initial,
  submitLabel,
  onSubmit,
  seedTitle,
}: {
  initial?: Partial<Item>;
  submitLabel: string;
  onSubmit: (value: ItemFormValue) => Promise<void>;
  seedTitle?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [priceText, setPriceText] = useState(
    initial?.price_cents != null ? (initial.price_cents / 100).toFixed(2) : "",
  );
  const [quantityText, setQuantityText] = useState(String(initial?.quantity ?? 1));
  const [note, setNote] = useState(initial?.note ?? "");
  const [images, setImages] = useState<string[]>(() => initialImages(initial));
  const [currency, setCurrency] = useState<string | null>(initial?.currency ?? null);
  const [isPriority, setIsPriority] = useState(initial?.is_priority ?? false);
  const [isGroupGift, setIsGroupGift] = useState(initial?.is_group_gift ?? false);
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // A tapped suggestion chip prefills the name field. Adjust state during
  // render when the chip changes (React's "you might not need an effect").
  const [lastSeed, setLastSeed] = useState(seedTitle);
  if (seedTitle !== lastSeed) {
    setLastSeed(seedTitle);
    if (seedTitle) setTitle(seedTitle);
  }

  // When adding, consume a link shared into the app from elsewhere.
  useEffect(() => {
    if (initial) return;
    pendingSharedUrl.get().then((shared) => {
      if (shared) {
        // Shared text may wrap the link in chatter — pull the clean URL out,
        // falling back to the raw string so nothing is silently dropped.
        setUrl(firstUrl(shared) ?? shared);
        void pendingSharedUrl.clear();
      }
    });
  }, [initial]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const uploaded = await wishlistsRepo.uploadItemImage(
        asset.base64!,
        asset.mimeType ?? "image/jpeg",
      );
      setImages((prev) => [...prev, uploaded]);
    } catch (e) {
      Alert.alert("Couldn't upload photo", String((e as Error).message));
    } finally {
      setUploading(false);
    }
  }

  async function fetchMeta() {
    if (!url.trim()) return;
    setScraping(true);
    try {
      const p = await scrapeRepo.fromUrl(url.trim());
      if (p.title) setTitle(p.title);
      // Use the scraped image as the cover only if no photos are set yet, so it
      // never clobbers ones the user added by hand.
      if (p.image) setImages((prev) => (prev.length === 0 ? [p.image!] : prev));
      if (p.currency) setCurrency(p.currency);
      if (p.price_cents != null) setPriceText((p.price_cents / 100).toFixed(2));
    } catch {
      Alert.alert("Couldn't fetch link", "Add the details manually instead.");
    } finally {
      setScraping(false);
    }
  }

  function resetForm() {
    setUrl("");
    setTitle("");
    setPriceText("");
    setQuantityText("1");
    setNote("");
    setImages([]);
    setCurrency(null);
    setIsPriority(false);
    setIsGroupGift(false);
  }

  async function submit() {
    // Bulk: when adding (not editing) and several links were pasted, create one
    // item per link, scraping each (falling back to the raw URL as the title).
    const urls = initial ? [] : splitUrls(url);
    if (urls.length > 1) {
      setSaving(true);
      try {
        for (const u of urls) {
          let itemTitle = u;
          let image: string | null = null;
          let priceCents: number | null = null;
          let curr: string | null = null;
          try {
            const p = await scrapeRepo.fromUrl(u);
            if (p.title) itemTitle = p.title;
            image = p.image;
            priceCents = p.price_cents;
            curr = p.currency;
          } catch {
            /* keep the URL as the title */
          }
          await onSubmit({
            title: clampLen(itemTitle, LIMITS.title),
            url: u,
            image_url: image,
            images: image ? [image] : [],
            price_cents: priceCents,
            currency: curr,
            note: null,
            quantity: 1,
            is_priority: false,
            is_group_gift: false,
          });
        }
        resetForm();
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: clampLen(title, LIMITS.title),
        url: url.trim() || null,
        image_url: images[0] ?? null,
        images,
        price_cents: parsePriceToCents(priceText),
        currency,
        note: note.trim() ? clampLen(note, LIMITS.note) : null,
        quantity: clampQuantity(quantityText),
        is_priority: isPriority,
        is_group_gift: isGroupGift,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ gap: 0 }}>
      <View style={styles.urlRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Paste a product link"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="url"
          value={url}
          onChangeText={setUrl}
          accessibilityLabel="Product link"
        />
        <Pressable
          style={styles.fetchBtn}
          onPress={fetchMeta}
          disabled={scraping}
          accessibilityRole="button"
          accessibilityLabel="Fetch product details from the link"
          accessibilityState={{ busy: scraping, disabled: scraping }}
        >
          {scraping ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.fetchText} maxFontSizeMultiplier={1.6}>Fetch</Text>
          )}
        </Pressable>
      </View>
      {!initial && <Text style={styles.tip}>Tip: paste several links to add them all at once.</Text>}

      <TextInput
        style={styles.input}
        placeholder="Item name"
        placeholderTextColor={colors.placeholder}
        value={title}
        onChangeText={setTitle}
        maxLength={LIMITS.title}
        accessibilityLabel="Item name"
      />

      <View style={styles.twoCol}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Price (e.g. 29.99)"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
          value={priceText}
          onChangeText={setPriceText}
          accessibilityLabel="Price"
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Qty"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          value={quantityText}
          onChangeText={setQuantityText}
          accessibilityLabel="Quantity"
        />
      </View>

      <TextInput
        style={[styles.input, styles.noteInput]}
        placeholder="Note (size, colour, link to a specific variant…)"
        placeholderTextColor={colors.placeholder}
        value={note}
        onChangeText={setNote}
        maxLength={LIMITS.note}
        multiline
        accessibilityLabel="Note"
      />

      <View style={styles.photoSection}>
        {images.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {images.map((uri, i) => (
              <View key={uri} style={styles.photoThumbWrap}>
                <Image
                  source={{ uri }}
                  style={styles.photo}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                {i === 0 ? (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                ) : null}
                <Pressable
                  onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  hitSlop={8}
                  style={styles.removeThumb}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${i + 1}`}
                >
                  <Text style={styles.removeThumbText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <Button
          title={images.length > 0 ? "Add another photo" : "Add photo"}
          variant="secondary"
          onPress={pickPhoto}
          loading={uploading}
        />
        {images.length > 1 ? (
          <Text style={styles.tip}>The first photo is the cover.</Text>
        ) : null}
      </View>

      <Pressable
        style={[styles.priorityRow, isPriority && styles.priorityRowOn]}
        onPress={() => setIsPriority((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Mark as most wanted"
        accessibilityState={{ selected: isPriority }}
      >
        <Text style={styles.priorityText}>
          {isPriority ? "★ Most wanted" : "☆ Mark as most wanted"}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.priorityRow, isGroupGift && styles.priorityRowOn]}
        onPress={() => setIsGroupGift((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Make this a group gift that members pool together"
        accessibilityState={{ selected: isGroupGift }}
      >
        <Text style={styles.priorityText}>
          {isGroupGift ? "🎁 Group gift — members pool together" : "🎁 Make this a group gift"}
        </Text>
      </Pressable>

      <Button title={submitLabel} onPress={submit} loading={saving} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    urlRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
    tip: { color: c.textMuted, fontSize: 12, marginTop: -4, marginBottom: 10 },
    twoCol: { flexDirection: "row", gap: 8 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      marginBottom: 10,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    noteInput: { minHeight: 72, textAlignVertical: "top" },
    photoSection: { gap: 8, marginBottom: 10 },
    photoStrip: { gap: 8, paddingVertical: 2 },
    photoThumbWrap: { position: "relative" },
    photo: { width: 72, height: 72, borderRadius: 8, backgroundColor: c.border },
    coverBadge: {
      position: "absolute",
      left: 4,
      bottom: 4,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    coverBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
    removeThumb: {
      position: "absolute",
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    removeThumbText: { color: c.onDanger, fontSize: 12, fontWeight: "800" },
    priorityRow: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      alignItems: "center",
    },
    priorityRowOn: { borderColor: c.accent, backgroundColor: c.accentSoft },
    priorityText: { color: c.accent, fontWeight: "700" },
    fetchBtn: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    fetchText: { color: c.onPrimary, fontWeight: "600" },
  });
