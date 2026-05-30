import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ItemForm } from "@/components/item-form";
import { formatPrice } from "@/lib/format";
import { deriveClaimState } from "@/lib/claim-state";
import { isSafeHttpUrl } from "@/lib/validation";
import { formatCountdown, isValidDateStr } from "@/lib/dates";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { claimsRepo } from "@/data/repositories/claims";
import { scrapeRepo } from "@/data/repositories/scrape";
import { subscribeToClaims } from "@/data/realtime";
import { useAuth } from "@/providers/auth";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Claim, Item, Wishlist } from "@/types/database";

function tapFeedback() {
  if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// Stable empty reference so memoized rows with no claims don't re-render.
const NO_CLAIMS: Claim[] = [];

// Prompts to seed an empty list — tapping one prefills the add form's name.
const GIFT_CATEGORIES = [
  "Books",
  "Kitchen",
  "Cozy",
  "Tech",
  "Experiences",
  "Games",
  "Self-care",
  "Outdoors",
];

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [list, setList] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Record<string, Claim[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [seedTitle, setSeedTitle] = useState<string | undefined>();
  const [eventDateText, setEventDateText] = useState("");
  const [priceChanged, setPriceChanged] = useState<Set<string>>(() => new Set());

  // Keep a ref to claims so the toggle handlers can stay stable (useCallback
  // without a claims dependency) — that lets memoized rows skip re-renders.
  const userId = user?.id;
  const claimsRef = useRef(claims);
  useEffect(() => {
    claimsRef.current = claims;
  }, [claims]);

  const isOwner = list?.owner_id === user?.id;
  const q = query.trim().toLowerCase();
  const visibleItems = q
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.note ?? "").toLowerCase().includes(q),
      )
    : items;

  const refreshClaims = useCallback(async (currentItems: Item[]) => {
    const rows = await claimsRepo.forItems(currentItems.map((i) => i.id));
    const byItem: Record<string, Claim[]> = {};
    for (const c of rows) (byItem[c.item_id] ??= []).push(c);
    setClaims(byItem);
  }, []);

  const load = useCallback(async () => {
    try {
      const [w, its] = await Promise.all([
        wishlistsRepo.get(id),
        wishlistsRepo.items(id),
      ]);
      setList(w);
      setEventDateText(w.event_date ?? "");
      setItems(its);
      await refreshClaims(its);
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load list", "error");
    } finally {
      setLoaded(true);
    }
  }, [id, refreshClaims, showToast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live updates: when anyone claims/releases, refresh. RLS guarantees the
  // owner's device never receives these events for their own list.
  useEffect(() => {
    if (isOwner) return; // owner sees no claim data by design
    const unsub = subscribeToClaims(() => {
      void wishlistsRepo.items(id).then(refreshClaims);
    });
    return unsub;
  }, [id, isOwner, refreshClaims]);

  const confirmDelete = useCallback((item: Item) => {
    Alert.alert("Delete item", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await wishlistsRepo.deleteItem(item.id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } catch (e) {
            Alert.alert("Couldn't delete", String((e as Error).message));
          }
        },
      },
    ]);
  }, []);

  function confirmDeleteList() {
    Alert.alert("Delete this list?", `"${list?.title}" and all its items will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete list",
        style: "destructive",
        onPress: async () => {
          try {
            await wishlistsRepo.remove(id);
            router.back();
          } catch (e) {
            Alert.alert("Couldn't delete", String((e as Error).message));
          }
        },
      },
    ]);
  }

  const togglePurchased = useCallback(
    async (item: Item) => {
      const mine = (claimsRef.current[item.id] ?? []).find((c) => c.buyer_id === userId);
      if (!mine) return;
      tapFeedback();
      const nextPurchased = mine.status !== "purchased";
      setClaims((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] ?? []).map((c) =>
          c.buyer_id === userId
            ? { ...c, status: nextPurchased ? "purchased" : "claimed" }
            : c,
        ),
      }));
      try {
        await claimsRepo.setPurchased(item.id, nextPurchased);
      } catch (e) {
        showToast(String((e as Error).message) || "Couldn't update", "error");
        await load();
      }
    },
    [userId, load, showToast],
  );

  const toggleClaim = useCallback(
    async (item: Item) => {
      if (!userId) return;
      const mineClaim = (claimsRef.current[item.id] ?? []).some(
        (c) => c.buyer_id === userId,
      );
      tapFeedback();
      // Optimistic update.
      setClaims((prev) => {
        const cur = prev[item.id] ?? [];
        if (mineClaim) {
          return { ...prev, [item.id]: cur.filter((c) => c.buyer_id !== userId) };
        }
        return {
          ...prev,
          [item.id]: [
            ...cur,
            {
              id: "optimistic",
              item_id: item.id,
              buyer_id: userId,
              status: "claimed",
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
      try {
        if (mineClaim) await claimsRepo.release(item.id);
        else await claimsRepo.claim(item.id);
      } catch (e) {
        showToast(String((e as Error).message) || "Claim failed", "error");
        await load(); // reconcile from server
      }
    },
    [userId, load, showToast],
  );

  const openUrl = useCallback(
    (url: string) => {
      if (isSafeHttpUrl(url)) void Linking.openURL(url);
      else showToast("Can't open this link", "error");
    },
    [showToast],
  );

  const openEditItem = useCallback(
    (item: Item) => router.push(`/edit-item/${item.id}`),
    [router],
  );

  // Re-scrape an item's link and update its price if it changed.
  const refreshPrice = useCallback(
    async (item: Item) => {
      if (!item.url) return;
      try {
        const p = await scrapeRepo.fromUrl(item.url);
        if (p.price_cents != null && p.price_cents !== item.price_cents) {
          await wishlistsRepo.updateItem(item.id, { price_cents: p.price_cents });
          setPriceChanged((prev) => new Set(prev).add(item.id));
          await load();
          showToast("Price updated", "success");
        } else {
          showToast("Price unchanged");
        }
      } catch {
        showToast("Couldn't refresh price", "error");
      }
    },
    [load, showToast],
  );

  async function saveEventDate() {
    const v = eventDateText.trim();
    if (v && !isValidDateStr(v)) {
      showToast("Use a date like 2026-12-25", "error");
      return;
    }
    try {
      await wishlistsRepo.setEventDate(id, v || null);
      await load();
      showToast("Occasion date saved", "success");
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't save date", "error");
    }
  }
  const openDiscuss = useCallback(
    (item: Item) => router.push(`/item-comments/${item.id}`),
    [router],
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: list?.title ?? "Wishlist" }} />
      {list?.event_date && formatCountdown(list.event_date) ? (
        <View style={styles.countdownBanner}>
          <Text style={styles.countdownText}>📅 {formatCountdown(list.event_date)}</Text>
        </View>
      ) : null}
      {items.length > 3 && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search this list…"
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Search items"
          />
        </View>
      )}
      <FlatList
        data={visibleItems}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loaded ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map((k) => (
                <SkeletonCard key={k} />
              ))}
            </View>
          ) : q ? (
            <EmptyState emoji="🔎" title="No matches" hint={`Nothing matches "${query.trim()}".`} />
          ) : (
            <EmptyState
              emoji={isOwner ? "📝" : "🎁"}
              title={isOwner ? "Your list is empty" : "Nothing here yet"}
              hint={
                isOwner
                  ? "Add items below — paste a link or type them in."
                  : "Check back once items are added."
              }
            />
          )
        }
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            claims={claims[item.id]}
            isOwner={isOwner}
            currentUserId={userId}
            onToggle={toggleClaim}
            onTogglePurchased={togglePurchased}
            onEdit={openEditItem}
            onDelete={confirmDelete}
            onDiscuss={openDiscuss}
            onOpenUrl={openUrl}
            onRefreshPrice={refreshPrice}
            priceChanged={priceChanged.has(item.id)}
          />
        )}
        ListFooterComponent={
          isOwner ? (
            <View style={styles.addBox}>
              {loaded && items.length === 0 && (
                <View style={styles.suggestWrap}>
                  <Text style={styles.sectionLabel}>Need ideas?</Text>
                  <View style={styles.chips}>
                    {GIFT_CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        style={styles.chip}
                        onPress={() => setSeedTitle(cat)}
                        accessibilityRole="button"
                        accessibilityLabel={`Add a ${cat} idea`}
                      >
                        <Text style={styles.chipText}>{cat}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.addHeaderRow}>
                <Text style={styles.sectionLabel}>Add an item</Text>
                <Pressable
                  onPress={() => router.push("/scan")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Scan a barcode"
                >
                  <Text style={styles.scanLink}>📷 Scan a barcode</Text>
                </Pressable>
              </View>
              <ItemForm
                submitLabel="Add to list"
                seedTitle={seedTitle}
                onSubmit={async (v) => {
                  await wishlistsRepo.addItem(id, v);
                  await load();
                }}
              />
              <View style={styles.occasionWrap}>
                <Text style={styles.sectionLabel}>Occasion date</Text>
                <View style={styles.occasionRow}>
                  <TextInput
                    style={[styles.search, { flex: 1 }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholder}
                    value={eventDateText}
                    onChangeText={setEventDateText}
                    autoCapitalize="none"
                    maxLength={10}
                  />
                  <Button title="Save" variant="secondary" onPress={saveEventDate} />
                </View>
              </View>

              <View style={styles.deleteListWrap}>
                <Button title="Delete this list" variant="danger" onPress={confirmDeleteList} />
              </View>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const ItemRow = memo(function ItemRow({
  item,
  claims,
  isOwner,
  currentUserId,
  onToggle,
  onTogglePurchased,
  onEdit,
  onDelete,
  onDiscuss,
  onOpenUrl,
  onRefreshPrice,
  priceChanged,
}: {
  item: Item;
  claims?: Claim[];
  isOwner: boolean;
  currentUserId?: string;
  onToggle: (item: Item) => void;
  onTogglePurchased: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onDiscuss: (item: Item) => void;
  onOpenUrl: (url: string) => void;
  onRefreshPrice: (item: Item) => void;
  priceChanged?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const { mine, count, full, purchased } = deriveClaimState(
    claims ?? NO_CLAIMS,
    currentUserId,
    item.quantity,
  );
  const multi = item.quantity > 1;
  const countLabel = `${count} of ${item.quantity} claimed`;

  return (
    <Card style={styles.item}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Text style={styles.thumbEmptyText}>🎁</Text>
        </View>
      )}
      <View style={styles.itemBody}>
        {item.is_priority && <Text style={styles.priorityTag}>★ Most wanted</Text>}
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {item.price_cents != null && (
            <Text style={styles.price}>
              {formatPrice(item.price_cents, item.currency)}
            </Text>
          )}
          {item.quantity > 1 && (
            <Text style={styles.qty}>Qty: {item.quantity}</Text>
          )}
          {priceChanged && <Text style={styles.priceBadge}>↓ price changed</Text>}
        </View>
        {item.note ? <Text style={styles.note}>{item.note}</Text> : null}

        {item.url && (
          <Pressable onPress={() => onOpenUrl(item.url!)} hitSlop={6}>
            <Text style={styles.link}>View product ↗</Text>
          </Pressable>
        )}

        {/* Owner: manage the item. Surprise Wall hides all claim state from them. */}
        {isOwner ? (
          <View style={styles.ownerActions}>
            <Pressable
              onPress={() => onEdit(item)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.title}`}
            >
              <Text style={styles.editAction}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(item)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
            >
              <Text style={styles.deleteAction}>Delete</Text>
            </Pressable>
            {item.url && (
              <Pressable
                onPress={() => onRefreshPrice(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Refresh price for ${item.title}`}
              >
                <Text style={styles.editAction}>Refresh price</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {multi && (mine || count > 0) && (
              <Text style={styles.countLabel}>{countLabel}</Text>
            )}
            {mine ? (
              <>
                <Pressable
                  onPress={() => onToggle(item)}
                  style={({ pressed }) => [
                    styles.claimBtn,
                    styles.claimedMine,
                    pressed && styles.pressedScale,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`You're buying ${item.title}. Tap to release your claim.`}
                >
                  <Text style={styles.claimedMineText}>
                    {purchased ? "Purchased 🎁" : "You're buying this ✓ (tap to release)"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onTogglePurchased(item)}
                  hitSlop={8}
                  style={styles.purchaseToggleWrap}
                  accessibilityRole="button"
                  accessibilityLabel={purchased ? "Mark as not purchased" : "Mark as purchased"}
                >
                  <Text style={styles.purchaseToggle}>
                    {purchased ? "Mark as not purchased" : "Mark as purchased"}
                  </Text>
                </Pressable>
              </>
            ) : full ? (
              <View style={[styles.claimBtn, styles.claimedOther]}>
                <Text style={styles.claimedOtherText}>
                  {multi ? "Fully claimed" : "Claimed by someone"}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => onToggle(item)}
                style={({ pressed }) => [styles.claimBtn, pressed && styles.pressedScale]}
                accessibilityRole="button"
                accessibilityLabel={`Claim ${item.title}`}
              >
                <Text style={styles.claimText}>
                  {multi ? "Claim one" : "Claim this gift"}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => onDiscuss(item)}
              hitSlop={6}
              style={styles.discussWrap}
              accessibilityRole="button"
              accessibilityLabel={`Discuss ${item.title}`}
            >
              <Text style={styles.discuss}>💬 Discuss</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Card>
  );
});

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 12 },
    countdownBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: c.accentSoft,
      alignItems: "center",
    },
    countdownText: { color: c.onAccentSoft, fontWeight: "700", fontSize: 14 },
    occasionWrap: { marginTop: 24 },
    occasionRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
    search: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    pressedScale: { transform: [{ scale: 0.97 }], opacity: 0.9 },
    item: { flexDirection: "row", gap: 12, padding: 12 },
    thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: c.border },
    thumbEmpty: { alignItems: "center", justifyContent: "center" },
    thumbEmptyText: { fontSize: 28 },
    itemBody: { flex: 1, gap: 6 },
    itemTitle: { fontSize: 16, fontWeight: "600", color: c.text },
    priorityTag: { fontSize: 12, fontWeight: "800", color: c.accent },
    metaRow: { flexDirection: "row", gap: 12, alignItems: "center" },
    price: { fontSize: 14, color: c.textMuted },
    qty: { fontSize: 14, color: c.textMuted, fontWeight: "600" },
    priceBadge: { fontSize: 12, color: c.accent, fontWeight: "700" },
    note: { fontSize: 13, color: c.textMuted, fontStyle: "italic" },
    countLabel: { fontSize: 12, color: c.textMuted, fontWeight: "700" },
    link: { fontSize: 14, color: c.accent, fontWeight: "600" },
    purchaseToggleWrap: { alignItems: "center" },
    purchaseToggle: { fontSize: 13, color: c.accent, fontWeight: "600" },
    discussWrap: { alignItems: "center", marginTop: 2 },
    discuss: { fontSize: 13, color: c.textMuted, fontWeight: "600" },
    claimBtn: {
      marginTop: 4,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.claim,
      alignItems: "center",
    },
    claimText: { color: c.onClaim, fontWeight: "600" },
    claimedMine: { backgroundColor: c.claimMine },
    claimedMineText: { color: c.onClaimMine, fontWeight: "600" },
    claimedOther: { backgroundColor: c.claimedOther },
    claimedOtherText: { color: c.onClaimedOther, fontWeight: "600" },
    ownerActions: { flexDirection: "row", gap: 20, marginTop: 4 },
    editAction: { color: c.accent, fontWeight: "600" },
    deleteAction: { color: c.danger, fontWeight: "600" },
    addBox: { marginTop: 24 },
    addHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    scanLink: { color: c.accent, fontWeight: "600", fontSize: 13, marginBottom: 8 },
    deleteListWrap: { marginTop: 24 },
    suggestWrap: { marginBottom: 20 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      backgroundColor: c.accentSoft,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    chipText: { color: c.onAccentSoft, fontWeight: "600", fontSize: 14 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: c.pageTextMuted,
      marginBottom: 8,
      textTransform: "uppercase",
    },
  });
