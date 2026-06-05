import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { commentsRepo, type CommentEntry } from "@/data/repositories/comments";
import { subscribeToComments } from "@/data/realtime";
import { moderateContent } from "@/lib/moderation";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

export default function ItemCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setComments(await commentsRepo.listForItem(id));
    } catch (e) {
      Alert.alert("Couldn't load comments", String((e as Error).message));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live updates: new comments from other buyers appear without a refresh.
  useEffect(() => {
    const unsub = subscribeToComments(id, () => void load());
    return unsub;
  }, [id, load]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await commentsRepo.add(id, draft);
      setDraft("");
      await load();
    } catch (e) {
      Alert.alert("Couldn't post", String((e as Error).message));
    } finally {
      setSending(false);
    }
  }

  function confirmRemove(c: CommentEntry) {
    Alert.alert("Delete comment", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await commentsRepo.remove(c.id);
            setComments((prev) => prev.filter((x) => x.id !== c.id));
          } catch (e) {
            Alert.alert("Couldn't delete", String((e as Error).message));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Discussion" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {"No comments yet. Coordinate here — the recipient can't see this."}
            </Text>
          }
          renderItem={({ item }) => (
            <Card style={styles.comment}>
              <View style={styles.commentHead}>
                <Text style={styles.author}>{item.authorName}</Text>
                {item.isMine ? (
                  <Pressable
                    onPress={() => confirmRemove(item)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Delete your comment"
                  >
                    <Text style={styles.delete}>Delete</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() =>
                      moderateContent({
                        authorId: item.author_id,
                        authorName: item.authorName,
                        contentType: "comment",
                        contentId: item.id,
                        onChanged: (m) => {
                          showToast(m);
                          void load();
                        },
                      })
                    }
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Report or block ${item.authorName}`}
                  >
                    <Text style={styles.report}>Report</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.body}>{item.body}</Text>
            </Card>
          )}
        />
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Add a comment…"
            placeholderTextColor={colors.placeholder}
            value={draft}
            onChangeText={setDraft}
            maxLength={1000}
            multiline
            accessibilityLabel="Add a comment"
          />
          <Button title="Post" onPress={send} loading={sending} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 8 },
    empty: { color: c.pageTextMuted, textAlign: "center", marginVertical: 24, lineHeight: 20 },
    comment: { padding: 12, gap: 4 },
    commentHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    author: { fontWeight: "700", color: c.text, fontSize: 14 },
    delete: { color: c.danger, fontSize: 13, fontWeight: "600" },
    report: { color: c.textMuted, fontSize: 13, fontWeight: "600" },
    body: { color: c.text, fontSize: 15 },
    composer: {
      padding: 12,
      gap: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      minHeight: 44,
      maxHeight: 120,
      backgroundColor: c.inputBg,
      color: c.inputText,
    },
  });
