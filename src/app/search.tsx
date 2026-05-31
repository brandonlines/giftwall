import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { searchRepo, type ItemHit, type PersonHit } from "@/data/repositories/search";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

type Row = { kind: "item"; hit: ItemHit } | { kind: "person"; hit: PersonHit };
type Section = { title: string; data: Row[] };

// Search items and people across every group you're in. The Surprise Wall still
// holds — RLS scopes results to your groups, and an item on your own list is
// labelled "Your list" (you never learn its claim state from here).
export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [query, setQuery] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (q.length < 2) {
        setSections([]);
        setSearched(false);
        return;
      }
      setSearching(true);
      try {
        const { items, people } = await searchRepo.query(q);
        const next: Section[] = [];
        if (items.length > 0) {
          next.push({ title: "Gifts", data: items.map((hit) => ({ kind: "item", hit })) });
        }
        if (people.length > 0) {
          next.push({ title: "People", data: people.map((hit) => ({ kind: "person", hit })) });
        }
        setSections(next);
      } catch (e) {
        showToast(String((e as Error).message) || "Search failed", "error");
      } finally {
        setSearching(false);
        setSearched(true);
      }
    },
    [showToast],
  );

  const onChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void run(text), 250);
    },
    [run],
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: "Search" }} />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          placeholder="Search gifts and people…"
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={onChange}
          autoFocus
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel="Search gifts and people"
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(row) => `${row.kind}:${row.hit.id}`}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {section.title}
          </Text>
        )}
        ListEmptyComponent={
          searching ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} accessibilityLabel="Searching" />
          ) : searched ? (
            <EmptyState emoji="🔎" title="No matches" hint={`Nothing matches "${query.trim()}".`} />
          ) : (
            <EmptyState
              emoji="🔎"
              title="Search everything"
              hint="Find a gift or a person across all your groups."
            />
          )
        }
        renderItem={({ item: row }) =>
          row.kind === "item" ? (
            <ItemResult hit={row.hit} onOpen={() => router.push(`/list/${row.hit.listId}`)} />
          ) : (
            <PersonResult hit={row.hit} />
          )
        }
      />
    </Screen>
  );
}

function ItemResult({ hit, onOpen }: { hit: ItemHit; onOpen: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card
      style={styles.row}
      onPress={onOpen}
      accessibilityLabel={`${hit.title}${hit.listTitle ? `, on ${hit.listTitle}` : ""}${hit.isMine ? ", your list" : ""}`}
    >
      {hit.imageUrl ? (
        <Image
          source={{ uri: hit.imageUrl }}
          style={styles.thumb}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={styles.thumbEmptyText}>🎁</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {hit.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {hit.isMine ? "Your list" : hit.listTitle ?? "A wishlist"}
        </Text>
      </View>
      <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
        ›
      </Text>
    </Card>
  );
}

function PersonResult({ hit }: { hit: PersonHit }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.row} accessibilityLabel={hit.name}>
      {hit.avatarUrl ? (
        <Image
          source={{ uri: hit.avatarUrl }}
          style={styles.avatar}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : (
        <View style={[styles.avatar, styles.thumbEmpty]} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={styles.avatarInitial}>{hit.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {hit.name}
      </Text>
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    searchWrap: { padding: 16, paddingBottom: 8 },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
    content: { padding: 16, paddingTop: 8, gap: 8 },
    sectionHeader: {
      fontSize: 13,
      fontWeight: "700",
      color: c.pageTextMuted,
      textTransform: "uppercase",
      marginTop: 12,
      marginBottom: 6,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
    thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: c.border },
    thumbEmpty: { alignItems: "center", justifyContent: "center" },
    thumbEmptyText: { fontSize: 20 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.border },
    avatarInitial: { fontSize: 18, fontWeight: "700", color: c.textMuted },
    title: { fontSize: 16, fontWeight: "600", color: c.text, flex: 1 },
    meta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    chevron: { fontSize: 22, color: c.textMuted },
  });
