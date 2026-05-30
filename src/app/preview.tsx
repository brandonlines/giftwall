import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ItemForm } from "@/components/item-form";
import { useTheme, useThemedStyles } from "@/theme/provider";
import { themeList, type ThemeColors } from "@/theme/themes";

// Backend-free design gallery so the look of every palette (and the Northern
// Lights glassmorphism) can be reviewed without signing in. Reachable at
// /preview; not part of the real navigation flow.
export default function PreviewScreen() {
  const { colors, theme, setTheme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>giftwall</Text>
        <Text style={styles.sub}>{theme.name} — {theme.description}</Text>

        <Text style={styles.section}>Themes</Text>
        <View style={styles.chips}>
          {themeList.map((t) => {
            const selected = t.key === theme.key;
            return (
              <Card
                key={t.key}
                onPress={() => setTheme(t.key)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <View style={styles.swatches}>
                  {[t.colors.primary, t.colors.accent, t.colors.claim].map((col, i) => (
                    <View key={i} style={[styles.swatch, { backgroundColor: col }]} />
                  ))}
                </View>
                <Text style={styles.chipText}>{t.name}</Text>
              </Card>
            );
          })}
        </View>

        <Text style={styles.section}>Group</Text>
        <Card style={styles.codeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.codeLabel}>Invite code · tap to share</Text>
            <Text style={styles.code}>FROST24</Text>
          </View>
          <Text style={styles.rotate}>Rotate</Text>
        </Card>
        <Card style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Mom's Christmas List</Text>
            <Text style={styles.rowMeta}>Tap to claim gifts</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Card>

        <Text style={styles.section}>Wishlist items</Text>
        <View style={styles.searchSample}>
          <Text style={styles.searchPlaceholder}>🔎  Search this list…</Text>
        </View>
        <Card style={styles.item}>
          <View style={styles.thumb}>
            <Text style={styles.thumbText}>🎁</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.priorityTag}>★ Most wanted</Text>
            <Text style={styles.itemTitle}>Wireless Headphones</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Text style={styles.price}>$129.00</Text>
              <Text style={[styles.price, { fontWeight: "600" }]}>Qty: 2</Text>
            </View>
            <Text style={styles.note}>Note: over-ear, charcoal colour</Text>
            <Text style={styles.link}>View product ↗</Text>
            <Text style={styles.countLabel}>1 of 2 claimed</Text>
            <View style={[styles.claimBtn, { backgroundColor: colors.claim }]}>
              <Text style={[styles.claimText, { color: colors.onClaim }]}>
                Claim one
              </Text>
            </View>
          </View>
        </Card>
        <Card style={styles.item}>
          <View style={styles.thumb}>
            <Text style={styles.thumbText}>📚</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.itemTitle}>The Midnight Library</Text>
            <Text style={styles.price}>$18.00</Text>
            <View style={[styles.claimBtn, { backgroundColor: colors.claimMine }]}>
              <Text style={[styles.claimText, { color: colors.onClaimMine }]}>
                Purchased 🎁
              </Text>
            </View>
            <Text style={[styles.link, { textAlign: "center" }]}>
              Mark as not purchased
            </Text>
          </View>
        </Card>
        <Card style={styles.item}>
          <View style={styles.thumb}>
            <Text style={styles.thumbText}>🧦</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.itemTitle}>Wool Socks</Text>
            <Text style={styles.price}>$24.00</Text>
            <View style={[styles.claimBtn, { backgroundColor: colors.claimedOther }]}>
              <Text style={[styles.claimText, { color: colors.onClaimedOther }]}>
                Claimed by someone
              </Text>
            </View>
          </View>
        </Card>

        <Text style={styles.section}>Activity feed</Text>
        {[
          { icon: "🎁", text: 'Dad added "Wool Socks" to Mom\'s Christmas List', time: "2m ago" },
          { icon: "📝", text: 'Mom created "Christmas List"', time: "1h ago" },
          { icon: "👋", text: "Grandma joined the group", time: "yesterday" },
        ].map((a, i) => (
          <Card key={i} style={styles.activityRow}>
            <Text style={styles.activityIcon}>{a.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityText}>{a.text}</Text>
              <Text style={styles.activityTime}>{a.time}</Text>
            </View>
          </Card>
        ))}

        <Text style={styles.section}>My shopping list</Text>
        {[
          { title: "Wireless Headphones", price: "$129.00", bought: false },
          { title: "Wool Socks", price: "$24.00", bought: true },
        ].map((s, i) => (
          <Card key={i} style={styles.shopRow}>
            <View style={[styles.shopBox, s.bought && styles.shopBoxOn]}>
              {s.bought && <Text style={styles.shopCheck}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.shopTitle, s.bought && styles.shopTitleDone]}>{s.title}</Text>
              <Text style={styles.shopPrice}>{s.price}</Text>
            </View>
          </Card>
        ))}

        <Text style={styles.section}>Item discussion (hidden from recipient)</Text>
        {[
          { who: "Dad", body: "I'll grab these — anyone want to split the cost?", mine: false },
          { who: "You", body: "Sure, I'm in for half!", mine: true },
        ].map((cm, i) => (
          <Card key={i} style={styles.commentRow}>
            <View style={styles.commentHead}>
              <Text style={styles.commentAuthor}>{cm.who}</Text>
              {cm.mine && <Text style={styles.commentDelete}>Delete</Text>}
            </View>
            <Text style={styles.commentBody}>{cm.body}</Text>
          </Card>
        ))}

        <Text style={styles.section}>Add / edit item form</Text>
        <Card style={{ padding: 16 }}>
          <ItemForm submitLabel="Add to list" onSubmit={async () => {}} />
        </Card>

        <Text style={styles.section}>Loading, empty & toast</Text>
        <SkeletonCard />
        <View style={{ height: 8 }} />
        <EmptyState emoji="🎁" title="No groups yet" hint="Create one or join with a code." />
        <View style={[styles.toastSample, { backgroundColor: colors.primary }]}>
          <Text style={[styles.toastText, { color: colors.onPrimary }]}>Saved ✓</Text>
        </View>

        <Text style={styles.section}>Buttons & inputs</Text>
        <View style={{ gap: 10 }}>
          <Button title="Primary action" onPress={() => {}} />
          <Button title="Secondary action" variant="secondary" onPress={() => {}} />
          <Button title="Danger action" variant="danger" onPress={() => {}} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, gap: 8 },
    h1: { fontSize: 32, fontWeight: "800", color: c.pageText },
    sub: { color: c.pageTextMuted, marginBottom: 8 },
    section: {
      fontSize: 13,
      fontWeight: "700",
      color: c.pageTextMuted,
      textTransform: "uppercase",
      marginTop: 20,
      marginBottom: 8,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 2, borderColor: c.border },
    chipSelected: { borderColor: c.accent },
    chipText: { color: c.text, fontWeight: "600", fontSize: 13 },
    swatches: { flexDirection: "row" },
    swatch: { width: 14, height: 14, borderRadius: 7, marginLeft: -4, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
    codeCard: { flexDirection: "row", alignItems: "center", backgroundColor: c.accentSoft, padding: 16, marginBottom: 8 },
    codeLabel: { fontSize: 12, color: c.onAccentSoft, fontWeight: "600" },
    code: { fontSize: 24, fontWeight: "800", color: c.onAccentSoft, letterSpacing: 2, marginTop: 2 },
    rotate: { color: c.onAccentSoft, fontWeight: "600" },
    row: { flexDirection: "row", alignItems: "center", padding: 16 },
    rowTitle: { fontSize: 17, fontWeight: "600", color: c.text },
    rowMeta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    chevron: { fontSize: 24, color: c.textMuted },
    item: { flexDirection: "row", gap: 12, padding: 12, marginBottom: 10 },
    thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: c.border, alignItems: "center", justifyContent: "center" },
    thumbText: { fontSize: 28 },
    itemTitle: { fontSize: 16, fontWeight: "600", color: c.text },
    priorityTag: { fontSize: 12, fontWeight: "800", color: c.accent },
    price: { fontSize: 14, color: c.textMuted },
    note: { fontSize: 13, color: c.textMuted, fontStyle: "italic" },
    countLabel: { fontSize: 12, color: c.textMuted, fontWeight: "700" },
    link: { fontSize: 14, color: c.accent, fontWeight: "600" },
    claimBtn: { marginTop: 4, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
    claimText: { fontWeight: "600" },
    searchSample: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.inputBg,
      marginBottom: 12,
    },
    searchPlaceholder: { color: c.placeholder, fontSize: 16 },
    activityRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 8 },
    activityIcon: { fontSize: 22 },
    activityText: { fontSize: 15, color: c.text },
    activityTime: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    commentRow: { padding: 12, marginBottom: 8, gap: 4 },
    commentHead: { flexDirection: "row", justifyContent: "space-between" },
    commentAuthor: { fontWeight: "700", color: c.text, fontSize: 14 },
    commentDelete: { color: c.danger, fontSize: 13, fontWeight: "600" },
    commentBody: { color: c.text, fontSize: 15 },
    shopRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 8 },
    shopBox: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    shopBoxOn: { backgroundColor: c.claimMine, borderColor: c.claimMine },
    shopCheck: { color: c.onClaimMine, fontWeight: "800", fontSize: 15 },
    shopTitle: { fontSize: 16, fontWeight: "600", color: c.text },
    shopTitleDone: { textDecorationLine: "line-through", color: c.textMuted },
    shopPrice: { fontSize: 14, color: c.textMuted, marginTop: 2 },
    toastSample: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginTop: 12 },
    toastText: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  });
