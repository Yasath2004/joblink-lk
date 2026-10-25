import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { ConversationItem, fetchConversations } from "../../data/socialApi";
import { colorFor } from "../../data/util";
import Avatar from "../../components/Avatar";
import { useLanguage } from "../../i18n/LanguageContext";

export default function MessagesScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations().then(setConversations);
    }, [])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    );
  }, [query, conversations]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>{t("messages")}</Text>
        <View style={styles.unreadPill}>
          <Text style={styles.unreadText}>
            {conversations.reduce((a, c) => a + c.unread, 0)} unread
          </Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("search_conversations_placeholder")}
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {conversations.length === 0 ? "No messages yet. Start a chat from a job or an applicant." : "No conversations match your search"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("Chat", { conversationId: item.id, name: item.name, avatarUrl: item.avatarUrl })}
          >
            <Avatar name={item.name} color={colorFor(item.name)} uri={item.avatarUrl} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View style={styles.rowTop}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <View style={styles.rowBottom}>
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.textDark },
  unreadPill: { backgroundColor: colors.surfaceMint, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  unreadText: { fontSize: 11, color: colors.primaryDark, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 13, color: colors.textDark },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  rowTop: { flexDirection: "row", justifyContent: "space-between" },
  name: { fontSize: 14, fontWeight: "700", color: colors.textDark },
  time: { fontSize: 11, color: colors.textMuted },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  lastMsg: { flex: 1, fontSize: 12, color: colors.textBody, marginRight: spacing.sm },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 },
});
