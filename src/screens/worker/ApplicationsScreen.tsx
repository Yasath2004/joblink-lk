import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { categoryColor, categoryIcon } from "../../data/mockData";
import { fetchMyApplications, MyApplication } from "../../data/jobsApi";
import { submitReview } from "../../data/profileApi";
import RateModal from "../../components/RateModal";

const TABS = ["Pending", "Accepted", "Declined"] as const;

export default function ApplicationsScreen({ navigation }: any) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending");
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [rateFor, setRateFor] = useState<MyApplication | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyApplications().then(setApplications);
    }, [])
  );

  const counts = {
    Pending: applications.filter((a) => a.status === "Pending").length,
    Accepted: applications.filter((a) => a.status === "Accepted").length,
    Declined: applications.filter((a) => a.status === "Declined").length,
  };

  const filtered = useMemo(() => applications.filter((a) => a.status === tab), [tab, applications]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>My Applications</Text>
        <Text style={styles.count}>{applications.length} total</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t} ({counts[t]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: spacing.xl }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No {tab.toLowerCase()} applications</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, shadow.card]}
            onPress={() => navigation.navigate("JobDetails", { job: item.job })}
          >
            <View
              style={[styles.iconWrap, { backgroundColor: categoryColor[item.job.category] + "20" }]}
            >
              <Ionicons name={categoryIcon[item.job.category] as any} size={20} color={categoryColor[item.job.category]} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <View style={styles.rowTop}>
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {item.job.title}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.employer}>{item.employerName}</Text>
              <View style={styles.rowBottom}>
                <Text style={styles.pay}>Rs. {item.job.pay.toLocaleString()}</Text>
                <Text style={styles.time}>{item.appliedAgo}</Text>
              </View>
              {item.status === "Accepted" && item.job.employerId && (
                <TouchableOpacity style={styles.rateBtn} onPress={() => setRateFor(item)}>
                  <Ionicons name="star-outline" size={12} color={colors.primaryDark} />
                  <Text style={styles.rateText}> Rate employer</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <RateModal
        visible={!!rateFor}
        title={`Rate ${rateFor?.employerName ?? "employer"}`}
        onClose={() => setRateFor(null)}
        onSubmit={async (rating, comment) => {
          try {
            await submitReview(rateFor!.job.id, rateFor!.job.employerId!, rating, comment);
            setRateFor(null);
            Alert.alert("Thanks!", "Your review was submitted.");
          } catch (e: any) {
            Alert.alert("Could not submit", e.message);
          }
        }}
      />
    </SafeAreaView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Pending: { bg: colors.amberBg, color: colors.amber },
    Accepted: { bg: colors.successBg, color: colors.success },
    Declined: { bg: colors.urgentBg, color: colors.urgent },
  };
  const c = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  title: { fontSize: 20, fontWeight: "800", color: colors.textDark },
  count: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  tabTextActive: { color: "#fff" },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  jobTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.textDark, marginRight: spacing.sm },
  employer: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  pay: { fontSize: 13, fontWeight: "800", color: colors.primaryDark },
  time: { fontSize: 11, color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 10, fontWeight: "700" },
  rateBtn: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  rateText: { fontSize: 12, color: colors.primaryDark, fontWeight: "700" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { color: colors.textMuted, marginTop: spacing.sm, fontSize: 13 },
});
