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
import { messagesRepo, type MessageEntry } from "@/data/repositories/messages";
import { subscribeToGroupMessages } from "@/data/realtime";
import { relativeTime } from "@/lib/format";
import { moderateContent } from "@/lib/moderation";
import { useTheme, useThemedStyles } from "@/theme/provider";
import type { ThemeColors } from "@/theme/themes";

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const showToast = useToast();
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setMessages(await messagesRepo.listForGroup(id));
    } catch (e) {
      Alert.alert("Couldn't load chat", String((e as Error).message));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live updates: new messages from other members appear without a refresh.
  useEffect(() => {
    const unsub = subscribeToGroupMessages(id, () => void load());
    return unsub;
  }, [id, load]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await messagesRepo.post(id, draft);
      setDraft("");
      await load();
    } catch (e) {
      Alert.alert("Couldn't send", String((e as Error).message));
    } finally {
      setSending(false);
    }
  }

  function confirmRemove(m: MessageEntry) {
    Alert.alert("Delete message", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await messagesRepo.remove(m.id);
            setMessages((prev) => prev.filter((x) => x.id !== m.id));
          } catch (e) {
            Alert.alert("Couldn't delete", String((e as Error).message));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Group chat" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {"No messages yet. Say hi — everyone in the group can see this."}
            </Text>
          }
          renderItem={({ item }) => (
            <Card style={styles.message}>
              <View style={styles.messageHead}>
                <Text style={styles.author}>{item.authorName}</Text>
                <View style={styles.headRight}>
                  <Text style={styles.time}>{relativeTime(item.created_at)}</Text>
                  {item.isMine ? (
                    <Pressable
                      onPress={() => confirmRemove(item)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Delete your message"
                    >
                      <Text style={styles.delete}>Delete</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() =>
                        moderateContent({
                          authorId: item.author_id,
                          authorName: item.authorName,
                          contentType: "message",
                          contentId: item.id,
                          groupId: id,
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
              </View>
              <Text style={styles.body}>{item.body}</Text>
            </Card>
          )}
        />
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Message the group…"
            placeholderTextColor={colors.placeholder}
            value={draft}
            onChangeText={setDraft}
            maxLength={1000}
            multiline
            accessibilityLabel="Message the group"
          />
          <Button title="Send" onPress={send} loading={sending} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    listContent: { padding: 16, gap: 8 },
    empty: { color: c.pageTextMuted, textAlign: "center", marginVertical: 24, lineHeight: 20 },
    message: { padding: 12, gap: 4 },
    messageHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    headRight: { flexDirection: "row", alignItems: "center", gap: 12 },
    author: { fontWeight: "700", color: c.text, fontSize: 14 },
    time: { color: c.textMuted, fontSize: 12 },
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
