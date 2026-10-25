import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { fetchNotifications, markAllNotificationsRead, NotificationItem } from "../../data/socialApi";

const LOOK: Record<string, { icon: string; color: string }> = {
  application: { icon: "person-add", color: "#3B82F6" },
  accepted: { icon: "checkmark-circle", color: "#22C55E" },
  rejected: { icon: "close-circle", color: "#EF4444" },
  message: { icon: "chatbubble", color: "#14B8A6" },
  info: { icon: "information-circle", color: "#F59E0B" },
};

export default function NotificationsScreen({ navigation }: any) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications().then(setItems);
    }, [])
  );

  const markAll = async () => {
    await markAllNotificationsRead();
    setItems((l) => l.map((n) => ({ ...n, unread: false })));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAll}>
          <Text style={styles.markRead}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing.xl }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const look = LOOK[item.type] ?? LOOK.info;
          return (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: look.color + "20" }]}>
                <Ionicons name={look.icon as any} size={18} color={look.color} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.body}</Text>
                <Text style={styles.notifTime}>{item.time}</Text>
              </View>
              {item.unread && <View style={styles.dot} />}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: "800", color: colors.textDark },
  markRead: { fontSize: 12, color: colors.primaryDark, fontWeight: "700" },
  row: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "flex-start",
  },
  iconWrap: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  notifTitle: { fontSize: 13, fontWeight: "700", color: colors.textDark },
  notifBody: { fontSize: 12, color: colors.textBody, marginTop: 2, lineHeight: 17 },
  notifTime: { fontSize: 10, color: colors.textMuted, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4 },
});
