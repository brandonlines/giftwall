import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as haptics from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ItemForm } from "@/components/item-form";
import { ItemReactions } from "@/components/item-reactions";
import { formatPrice } from "@/lib/format";
import { deriveClaimState } from "@/lib/claim-state";
import { deriveReserveState } from "@/lib/reserve-state";
import { isSafeHttpUrl } from "@/lib/validation";
import { occasionCountdown, isValidDateStr } from "@/lib/dates";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { claimsRepo } from "@/data/repositories/claims";
import { reservationsRepo } from "@/data/repositories/reservations";
import { scrapeRepo } from "@/data/repositories/scrape";
import { groupsRepo } from "@/data/repositories/groups";
import { subscribeToClaims, subscribeToReservations } from "@/data/realtime";
import { useAuth } from "@/providers/auth";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Claim, Item, Reservation, Wishlist } from "@/types/database";

// Stable empty references so memoized rows with no claims/reservations don't re-render.
const NO_CLAIMS: Claim[] = [];
const NO_RESERVATIONS: Reservation[] = [];

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
  const [reservations, setReservations] = useState<Record<string, Reservation[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [seedTitle, setSeedTitle] = useState<string | undefined>();
  const [eventDateText, setEventDateText] = useState("");
  const [recursYearly, setRecursYearly] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [priceChanged, setPriceChanged] = useState<Set<string>>(() => new Set());

  // Keep a ref to claims so the toggle handlers can stay stable (useCallback
  // without a claims dependency) — that lets memoized rows skip re-renders.
  const userId = user?.id;
  const claimsRef = useRef(claims);
  useEffect(() => {
    claimsRef.current = claims;
  }, [claims]);
  const reservationsRef = useRef(reservations);
  useEffect(() => {
    reservationsRef.current = reservations;
  }, [reservations]);

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

  const refreshReservations = useCallback(async (currentItems: Item[]) => {
    const rows = await reservationsRepo.forItems(currentItems.map((i) => i.id));
    const byItem: Record<string, Reservation[]> = {};
    for (const r of rows) (byItem[r.item_id] ??= []).push(r);
    setReservations(byItem);
  }, []);

  const load = useCallback(async () => {
    try {
      const [w, its] = await Promise.all([
        wishlistsRepo.get(id),
        wishlistsRepo.items(id),
      ]);
      setList(w);
      setEventDateText(w.event_date ?? "");
      setRecursYearly(w.recurs_yearly);
      setItems(its);
      // The group's shared cover, fetched non-blocking (decorative).
      void groupsRepo
        .get(w.group_id)
        .then((g) => setCoverUrl(g.background_url))
        .catch(() => {});
      await refreshClaims(its);
      // Reservations follow the same Surprise Wall — the owner gets an empty set.
      if (w.owner_id !== userId) void refreshReservations(its);
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't load list", "error");
    } finally {
      setLoaded(true);
    }
  }, [id, userId, refreshClaims, refreshReservations, showToast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live updates: when anyone claims/releases, refresh. RLS guarantees the
  // owner's device never receives these events for their own list.
  useEffect(() => {
    if (isOwner) return; // owner sees no claim data by design
    const unsubClaims = subscribeToClaims(() => {
      void wishlistsRepo.items(id).then(refreshClaims);
    });
    const unsubReservations = subscribeToReservations(() => {
      void wishlistsRepo.items(id).then(refreshReservations);
    });
    return () => {
      unsubClaims();
      unsubReservations();
    };
  }, [id, isOwner, refreshClaims, refreshReservations]);

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
      haptics.tap();
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

  // Giver's half of the two-party reveal: opt this claim in/out of being shown
  // to the recipient (who must also opt in before they see it).
  const toggleReveal = useCallback(
    async (item: Item, revealed: boolean) => {
      haptics.tap();
      setClaims((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] ?? []).map((c) =>
          c.buyer_id === userId ? { ...c, revealed } : c,
        ),
      }));
      try {
        await claimsRepo.setRevealed(item.id, revealed);
        showToast(revealed ? "They'll see this gift 🎁" : "Hidden again", "success");
      } catch (e) {
        showToast(String((e as Error).message) || "Couldn't update", "error");
        await load();
      }
    },
    [userId, load, showToast],
  );

  // Owner reorders the list with ▲▼: swap with the neighbor, persist positions.
  const moveItem = useCallback(
    async (item: Item, dir: -1 | 1) => {
      const idx = items.findIndex((i) => i.id === item.id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= items.length) return;
      const next = [...items];
      [next[idx], next[j]] = [next[j], next[idx]];
      setItems(next);
      haptics.tap();
      try {
        await wishlistsRepo.reorder(next.map((i) => i.id));
      } catch (e) {
        showToast(String((e as Error).message) || "Couldn't reorder", "error");
        await load();
      }
    },
    [items, showToast, load],
  );

  const toggleClaim = useCallback(
    async (item: Item) => {
      if (!userId) return;
      const mineClaim = (claimsRef.current[item.id] ?? []).some(
        (c) => c.buyer_id === userId,
      );
      haptics.tap();
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
              revealed: false,
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

  // Soft interest: a "thinking about this" flag that never blocks a claim.
  const toggleReserve = useCallback(
    async (item: Item) => {
      if (!userId) return;
      const mineReserved = (reservationsRef.current[item.id] ?? []).some(
        (r) => r.user_id === userId,
      );
      haptics.tap();
      setReservations((prev) => {
        const cur = prev[item.id] ?? [];
        if (mineReserved) {
          return { ...prev, [item.id]: cur.filter((r) => r.user_id !== userId) };
        }
        return {
          ...prev,
          [item.id]: [
            ...cur,
            { id: "optimistic", item_id: item.id, user_id: userId, created_at: new Date().toISOString() },
          ],
        };
      });
      try {
        if (mineReserved) await reservationsRepo.release(item.id);
        else await reservationsRepo.reserve(item.id);
      } catch (e) {
        showToast(String((e as Error).message) || "Couldn't update", "error");
        await load();
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
      await wishlistsRepo.setOccasion(id, v || null, v ? recursYearly : false);
      await load();
      showToast("Occasion saved", "success");
    } catch (e) {
      showToast(String((e as Error).message) || "Couldn't save date", "error");
    }
  }
  const openDiscuss = useCallback(
    (item: Item) => router.push(`/item-comments/${item.id}`),
    [router],
  );
  const openChipIn = useCallback(
    (item: Item) =>
      router.push({
        pathname: "/chip-in/[id]",
        params: {
          id: item.id,
          title: item.title,
          price: item.price_cents != null ? String(item.price_cents) : "",
        },
      }),
    [router],
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: list?.title ?? "Wishlist" }} />
      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={styles.listCover}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : null}
      {list?.event_date && occasionCountdown(list.event_date, list.recurs_yearly) ? (
        <View style={styles.countdownBanner}>
          <Text style={styles.countdownText}>
            📅 {occasionCountdown(list.event_date, list.recurs_yearly)}
            {list.recurs_yearly ? " 🔁" : ""}
          </Text>
        </View>
      ) : null}
      {isOwner && loaded && items.length > 0 ? (
        <View style={styles.surpriseBanner}>
          <Text style={styles.surpriseEmoji} accessibilityElementsHidden importantForAccessibility="no">
            🤫
          </Text>
          <Text style={styles.surpriseText}>
            This is your list — who claimed or bought each item stays hidden from you, so your gifts stay a surprise.
          </Text>
        </View>
      ) : null}
      {isOwner && loaded && items.length > 0 ? (
        <Pressable
          style={styles.revealLink}
          onPress={() => router.push(`/reveal/${id}`)}
          accessibilityRole="button"
          accessibilityLabel="See who gave what"
        >
          <Text style={styles.revealLinkText}>🎁 See who gave what →</Text>
        </Pressable>
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
        renderItem={({ item, index }) => (
          <ItemRow
            item={item}
            claims={claims[item.id]}
            reservations={reservations[item.id]}
            isOwner={isOwner}
            currentUserId={userId}
            onToggle={toggleClaim}
            onTogglePurchased={togglePurchased}
            onToggleReveal={toggleReveal}
            onReserve={toggleReserve}
            onEdit={openEditItem}
            onDelete={confirmDelete}
            onDiscuss={openDiscuss}
            onChipIn={openChipIn}
            onOpenUrl={openUrl}
            onRefreshPrice={refreshPrice}
            onMove={moveItem}
            reorder={
              isOwner && !q ? { up: index > 0, down: index < items.length - 1 } : null
            }
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
                    accessibilityLabel="Occasion date, format year-month-day"
                  />
                  <Button title="Save" variant="secondary" onPress={saveEventDate} />
                </View>
                <View style={styles.recurRow}>
                  <Switch
                    value={recursYearly}
                    onValueChange={setRecursYearly}
                    accessibilityLabel="Repeats every year"
                  />
                  <Text style={styles.recurLabel}>🔁 Repeats every year (birthday)</Text>
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
  reservations,
  isOwner,
  currentUserId,
  onToggle,
  onTogglePurchased,
  onToggleReveal,
  onReserve,
  onEdit,
  onDelete,
  onDiscuss,
  onChipIn,
  onOpenUrl,
  onRefreshPrice,
  onMove,
  reorder,
  priceChanged,
}: {
  item: Item;
  claims?: Claim[];
  reservations?: Reservation[];
  isOwner: boolean;
  currentUserId?: string;
  onToggle: (item: Item) => void;
  onTogglePurchased: (item: Item) => void;
  onToggleReveal: (item: Item, revealed: boolean) => void;
  onReserve: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onDiscuss: (item: Item) => void;
  onChipIn: (item: Item) => void;
  onOpenUrl: (url: string) => void;
  onRefreshPrice: (item: Item) => void;
  onMove: (item: Item, dir: -1 | 1) => void;
  reorder: { up: boolean; down: boolean } | null;
  priceChanged?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const { mine, count, full, purchased } = deriveClaimState(
    claims ?? NO_CLAIMS,
    currentUserId,
    item.quantity,
  );
  const reserve = deriveReserveState(reservations ?? NO_RESERVATIONS, currentUserId);
  const multi = item.quantity > 1;
  const countLabel = `${count} of ${item.quantity} claimed`;

  return (
    <Card style={styles.item}>
      {item.image_url ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.thumb}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : (
        <View
          style={[styles.thumb, styles.thumbEmpty]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
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

        {item.photos && item.photos.length > 0 ? (
          <View style={styles.galleryRow} accessibilityLabel={`${item.photos.length} more photos`}>
            {item.photos.map((p) => (
              <Image
                key={p}
                source={{ uri: p }}
                style={styles.galleryThumb}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            ))}
          </View>
        ) : null}

        {item.url && (
          <Pressable
            onPress={() => onOpenUrl(item.url!)}
            hitSlop={6}
            accessibilityRole="link"
            accessibilityLabel={`View ${item.title} product page`}
          >
            <Text style={styles.link}>View product ↗</Text>
          </Pressable>
        )}

        <ItemReactions itemId={item.id} />

        {/* Owner: manage the item. Surprise Wall hides all claim state from them. */}
        {isOwner ? (
          <View style={styles.ownerActions}>
            {reorder ? (
              <View style={styles.reorderBtns}>
                <Pressable
                  onPress={() => onMove(item, -1)}
                  disabled={!reorder.up}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${item.title} up`}
                >
                  <Text style={[styles.reorderArrow, !reorder.up && styles.reorderArrowOff]}>▲</Text>
                </Pressable>
                <Pressable
                  onPress={() => onMove(item, 1)}
                  disabled={!reorder.down}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${item.title} down`}
                >
                  <Text style={[styles.reorderArrow, !reorder.down && styles.reorderArrowOff]}>▼</Text>
                </Pressable>
              </View>
            ) : null}
            {item.is_group_gift && <Text style={styles.groupGiftTag}>🎁 Group gift</Text>}
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
            {item.is_group_gift ? (
              <Pressable
                onPress={() => onChipIn(item)}
                style={({ pressed }) => [styles.claimBtn, styles.groupGiftBtn, pressed && styles.pressedScale]}
                accessibilityRole="button"
                accessibilityLabel={`Chip in on ${item.title}`}
              >
                <Text style={styles.groupGiftBtnText}>🎁 Group gift — chip in together</Text>
              </Pressable>
            ) : (
              <>
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
                <Pressable
                  onPress={() => onToggleReveal(item, !mine.revealed)}
                  hitSlop={8}
                  style={styles.purchaseToggleWrap}
                  accessibilityRole="button"
                  accessibilityLabel={
                    mine.revealed
                      ? "Hide your gift from the recipient"
                      : "Let the recipient see your gift after the occasion"
                  }
                >
                  <Text style={styles.revealToggle}>
                    {mine.revealed ? "🎁 Revealed to them ✓" : "🎁 Reveal my gift to them"}
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
            {reserve.others > 0 ? (
              <Text style={styles.reserveNote}>
                🔖 {reserve.others} {reserve.others === 1 ? "person is" : "people are"} considering this
              </Text>
            ) : null}
            {!mine && (!full || reserve.mine) ? (
              <Pressable
                onPress={() => onReserve(item)}
                hitSlop={8}
                style={styles.purchaseToggleWrap}
                accessibilityRole="button"
                accessibilityLabel={
                  reserve.mine ? "Remove your reservation" : "Reserve this for later"
                }
                accessibilityState={{ selected: reserve.mine }}
              >
                <Text style={styles.reserveToggle}>
                  {reserve.mine
                    ? "🔖 Reserved — thinking about it (tap to undo)"
                    : "🔖 Reserve for later"}
                </Text>
              </Pressable>
            ) : null}
              </>
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
    listCover: {
      height: 104,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: c.accentSoft,
    },
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
    surpriseBanner: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    surpriseEmoji: { fontSize: 18 },
    surpriseText: { flex: 1, color: c.textMuted, fontSize: 13, lineHeight: 18 },
    revealLink: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
    revealLinkText: { color: c.accent, fontWeight: "700", fontSize: 14 },
    occasionWrap: { marginTop: 24 },
    occasionRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    recurRow: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 12 },
    recurLabel: { fontSize: 14, color: c.text, flex: 1 },
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
    groupGiftBtn: { backgroundColor: c.accentSoft, borderWidth: 1, borderColor: c.accent },
    groupGiftBtnText: { color: c.onAccentSoft, fontWeight: "700", textAlign: "center" },
    groupGiftTag: { fontSize: 13, fontWeight: "700", color: c.accent, alignSelf: "center" },
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
    galleryRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
    galleryThumb: { width: 52, height: 52, borderRadius: 6, backgroundColor: c.border },
    countLabel: { fontSize: 12, color: c.textMuted, fontWeight: "700" },
    link: { fontSize: 14, color: c.accent, fontWeight: "600" },
    purchaseToggleWrap: { alignItems: "center" },
    purchaseToggle: { fontSize: 13, color: c.accent, fontWeight: "600" },
    revealToggle: { fontSize: 13, color: c.accent, fontWeight: "700" },
    reserveToggle: { fontSize: 13, color: c.accent, fontWeight: "600" },
    reserveNote: { fontSize: 12, color: c.textMuted, fontWeight: "600" },
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
    ownerActions: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 4 },
    reorderBtns: { flexDirection: "row", gap: 12, marginRight: -4 },
    reorderArrow: { fontSize: 16, color: c.accent, fontWeight: "800" },
    reorderArrowOff: { color: c.border },
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
