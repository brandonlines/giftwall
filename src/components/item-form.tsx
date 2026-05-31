import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
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
import { splitUrls } from "@/lib/urls";
import { pendingSharedUrl } from "@/lib/share-intent";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Item } from "@/types/database";

export type ItemFormValue = {
  title: string;
  url: string | null;
  image_url: string | null;
  price_cents: number | null;
  currency: string | null;
  note: string | null;
  quantity: number;
  is_priority: boolean;
  is_group_gift: boolean;
  photos: string[];
};

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
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
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
        setUrl(shared);
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
      setImageUrl(uploaded);
    } catch (e) {
      Alert.alert("Couldn't upload photo", String((e as Error).message));
    } finally {
      setUploading(false);
    }
  }

  async function addMorePhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled) return;
    const assets = result.assets.filter((a) => a.base64);
    if (assets.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        assets.map((a) => wishlistsRepo.uploadItemImage(a.base64!, a.mimeType ?? "image/jpeg")),
      );
      setPhotos((p) => [...p, ...urls]);
    } catch (e) {
      Alert.alert("Couldn't upload photos", String((e as Error).message));
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
      if (p.image) setImageUrl(p.image);
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
    setImageUrl(null);
    setPhotos([]);
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
            price_cents: priceCents,
            currency: curr,
            note: null,
            quantity: 1,
            is_priority: false,
            is_group_gift: false,
            photos: [],
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
        image_url: imageUrl,
        price_cents: parsePriceToCents(priceText),
        currency,
        note: note.trim() ? clampLen(note, LIMITS.note) : null,
        quantity: clampQuantity(quantityText),
        is_priority: isPriority,
        is_group_gift: isGroupGift,
        photos,
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
        />
        <Pressable style={styles.fetchBtn} onPress={fetchMeta} disabled={scraping}>
          {scraping ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.fetchText}>Fetch</Text>
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
      />

      <View style={styles.twoCol}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Price (e.g. 29.99)"
          placeholderTextColor={colors.placeholder}
          keyboardType="decimal-pad"
          value={priceText}
          onChangeText={setPriceText}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Qty"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
          value={quantityText}
          onChangeText={setQuantityText}
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
      />

      <View style={styles.photoRow}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Text style={styles.photoEmptyText}>🎁</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <Button
            title={imageUrl ? "Change photo" : "Add photo"}
            variant="secondary"
            onPress={pickPhoto}
            loading={uploading}
          />
          {imageUrl ? (
            <Pressable
              onPress={() => setImageUrl(null)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Text style={styles.removePhoto}>Remove photo</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.morePhotos}>
        {photos.map((p, i) => (
          <View key={p} style={styles.morePhotoWrap}>
            <Image source={{ uri: p }} style={styles.morePhoto} />
            <Pressable
              onPress={() => setPhotos((cur) => cur.filter((_, idx) => idx !== i))}
              hitSlop={6}
              style={styles.morePhotoRemove}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Text style={styles.morePhotoRemoveText}>✕</Text>
            </Pressable>
          </View>
        ))}
        <Pressable onPress={addMorePhotos} style={styles.addMore} disabled={uploading}>
          <Text style={styles.addMoreText}>＋ More photos</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.priorityRow, isPriority && styles.priorityRowOn]}
        onPress={() => setIsPriority((v) => !v)}
      >
        <Text style={styles.priorityText}>
          {isPriority ? "★ Most wanted" : "☆ Mark as most wanted"}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.priorityRow, isGroupGift && styles.priorityRowOn]}
        onPress={() => setIsGroupGift((v) => !v)}
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
    photoRow: { flexDirection: "row", gap: 12, alignItems: "center", marginBottom: 10 },
    photo: { width: 64, height: 64, borderRadius: 8, backgroundColor: c.border },
    photoEmpty: { alignItems: "center", justifyContent: "center" },
    photoEmptyText: { fontSize: 26 },
    photoActions: { flex: 1, gap: 6 },
    removePhoto: { color: c.danger, fontWeight: "600", textAlign: "center" },
    morePhotos: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
    morePhotoWrap: { position: "relative" },
    morePhoto: { width: 56, height: 56, borderRadius: 8, backgroundColor: c.border },
    morePhotoRemove: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: c.danger,
      borderRadius: 11,
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    morePhotoRemoveText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    addMore: {
      width: 56,
      height: 56,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
    addMoreText: { color: c.accent, fontWeight: "700", fontSize: 11, textAlign: "center" },
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
