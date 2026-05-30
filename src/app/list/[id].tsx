import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { ItemForm } from "@/components/item-form";
import { wishlistsRepo } from "@/data/repositories/wishlists";
import { claimsRepo } from "@/data/repositories/claims";
import { subscribeToClaims } from "@/data/realtime";
import { useAuth } from "@/providers/auth";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";
import type { Claim, Item, Wishlist } from "@/types/database";

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [list, setList] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Record<string, Claim[]>>({});
  const [loaded, setLoaded] = useState(false);

  const isOwner = list?.owner_id === user?.id;

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

  function confirmDelete(item: Item) {
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
  }

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

  async function togglePurchased(item: Item) {
    const mine = (claims[item.id] ?? []).find((c) => c.buyer_id === user?.id);
    if (!mine) return;
    const nextPurchased = mine.status !== "purchased";
    setClaims((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] ?? []).map((c) =>
        c.buyer_id === user?.id
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
  }

  async function toggleClaim(item: Item) {
    const list = claims[item.id] ?? [];
    const mineClaim = list.some((c) => c.buyer_id === user?.id);
    // Optimistic update.
    setClaims((prev) => {
      const cur = prev[item.id] ?? [];
      if (mineClaim) {
        return { ...prev, [item.id]: cur.filter((c) => c.buyer_id !== user?.id) };
      }
      if (!user) return prev;
      return {
        ...prev,
        [item.id]: [
          ...cur,
          {
            id: "optimistic",
            item_id: item.id,
            buyer_id: user.id,
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
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: list?.title ?? "Wishlist" }} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loaded ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2].map((k) => (
                <SkeletonCard key={k} />
              ))}
            </View>
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
            claims={claims[item.id] ?? []}
            isOwner={isOwner}
            currentUserId={user?.id}
            onToggle={() => toggleClaim(item)}
            onTogglePurchased={() => togglePurchased(item)}
            onEdit={() => router.push(`/edit-item/${item.id}`)}
            onDelete={() => confirmDelete(item)}
            onDiscuss={() => router.push(`/item-comments/${item.id}`)}
          />
        )}
        ListFooterComponent={
          isOwner ? (
            <View style={styles.addBox}>
              <Text style={styles.sectionLabel}>Add an item</Text>
              <ItemForm
                submitLabel="Add to list"
                onSubmit={async (v) => {
                  await wishlistsRepo.addItem(id, v);
                  await load();
                }}
              />
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

function ItemRow({
  item,
  claims,
  isOwner,
  currentUserId,
  onToggle,
  onTogglePurchased,
  onEdit,
  onDelete,
  onDiscuss,
}: {
  item: Item;
  claims: Claim[];
  isOwner: boolean;
  currentUserId?: string;
  onToggle: () => void;
  onTogglePurchased: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDiscuss: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const mine = claims.find((c) => c.buyer_id === currentUserId);
  const count = claims.length;
  const qty = item.quantity;
  const multi = qty > 1;
  const full = !mine && count >= qty;
  const purchased = mine?.status === "purchased";
  const countLabel = `${count} of ${qty} claimed`;

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
        </View>
        {item.note ? <Text style={styles.note}>{item.note}</Text> : null}

        {item.url && (
          <Pressable onPress={() => Linking.openURL(item.url!)} hitSlop={6}>
            <Text style={styles.link}>View product ↗</Text>
          </Pressable>
        )}

        {/* Owner: manage the item. Surprise Wall hides all claim state from them. */}
        {isOwner ? (
          <View style={styles.ownerActions}>
            <Pressable
              onPress={onEdit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${item.title}`}
            >
              <Text style={styles.editAction}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
            >
              <Text style={styles.deleteAction}>Delete</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            {multi && (mine || count > 0) && (
              <Text style={styles.countLabel}>{countLabel}</Text>
            )}
            {mine ? (
              <>
                <Pressable
                  onPress={onToggle}
                  style={[styles.claimBtn, styles.claimedMine]}
                  accessibilityRole="button"
                  accessibilityLabel={`You're buying ${item.title}. Tap to release your claim.`}
                >
                  <Text style={styles.claimedMineText}>
                    {purchased ? "Purchased 🎁" : "You're buying this ✓ (tap to release)"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onTogglePurchased}
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
                onPress={onToggle}
                style={styles.claimBtn}
                accessibilityRole="button"
                accessibilityLabel={`Claim ${item.title}`}
              >
                <Text style={styles.claimText}>
                  {multi ? "Claim one" : "Claim this gift"}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={onDiscuss}
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
}

function formatPrice(cents: number, currency: string | null) {
  const amount = (cents / 100).toFixed(2);
  return currency ? `${currency} ${amount}` : `$${amount}`;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 12 },
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
    deleteListWrap: { marginTop: 24 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: c.pageTextMuted,
      marginBottom: 8,
      textTransform: "uppercase",
    },
  });
