import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import {
  ChatMsg,
  fetchMessages,
  getOrCreateConversation,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
} from "../../data/socialApi";
import { colorFor } from "../../data/util";
import Avatar from "../../components/Avatar";

export default function ChatScreen({ route, navigation }: any) {
  // Open with either { conversationId } (existing chat) or { otherId } (start a new one)
  const { conversationId, otherId, name = "Chat", avatarUrl } = route.params || {};
  const [convId, setConvId] = useState<string | undefined>(conversationId);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<ChatMsg>>(null);

  const addMessage = (m: ChatMsg) =>
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const id = convId ?? (otherId ? await getOrCreateConversation(otherId) : undefined);
        if (!id || cancelled) return;
        setConvId(id);
        setMessages(await fetchMessages(id));
        markConversationRead(id);
        const u = await subscribeToMessages(id, (m) => {
          addMessage(m);
          if (!m.fromMe) markConversationRead(id);
        });
        if (cancelled) u();
        else unsub = u;
      } catch (e: any) {
        Alert.alert("Chat error", e.message);
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body || !convId) return;
    setText("");
    try {
      addMessage(await sendMessage(convId, body));
    } catch (e: any) {
      setText(body);
      Alert.alert("Message not sent", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Avatar name={name} color={colorFor(name)} uri={avatarUrl} size={36} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.name}>{name}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.xl }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.fromMe && { justifyContent: "flex-end" }]}>
              <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, item.fromMe && { color: "#fff" }]}>{item.text}</Text>
              </View>
            </View>
          )}
        />

        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            onSubmitEditing={send}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send}>
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { fontSize: 14, fontWeight: "700", color: colors.textDark },
  status: { fontSize: 11, color: colors.success },
  bubbleRow: { flexDirection: "row", marginBottom: spacing.md },
  bubble: { maxWidth: "78%", borderRadius: radius.lg, padding: spacing.md },
  bubbleThem: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 13, color: colors.textDark, lineHeight: 18 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 42,
    fontSize: 13,
    color: colors.textDark,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
