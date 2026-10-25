import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { FlatList, Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { PostedJob, categoryColor, categoryIcon } from "../../data/mockData";
import { fetchMyJobs } from "../../data/jobsApi";
import Chip from "../../components/Chip";
import { fetchMyProfile } from "../../data/profileApi";

const TABS = ["All Jobs", "Active", "Closed"] as const;

export default function MyJobsScreen({ navigation }: any) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Jobs");
  const [postedJobs, setPostedJobs] = useState<PostedJob[]>([]);
  const [myName, setMyName] = useState("");

  const load = useCallback(() => {
    fetchMyJobs().then(setPostedJobs);
    fetchMyProfile().then((p) => setMyName(p?.fullName ?? ""));
  }, []);
  useFocusEffect(load);

  const filtered = useMemo(() => {
    if (tab === "All Jobs") return postedJobs;
    return postedJobs.filter((j) => j.status === tab.toLowerCase());
  }, [tab, postedJobs]);

  const activeCount = postedJobs.filter((j) => j.status === "active").length;
  const totalApplicants = postedJobs.reduce((a, j) => a + j.applicants, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>{myName || "My Jobs"}</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={{ marginRight: spacing.md }}>
            <Ionicons name="notifications-outline" size={20} color={colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, shadow.card]}>
          <Text style={styles.statNum}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Jobs</Text>
        </View>
        <View style={[styles.statCard, shadow.card]}>
          <Text style={styles.statNum}>{totalApplicants}</Text>
          <Text style={styles.statLabel}>Applicants</Text>
        </View>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => navigation.navigate("PostJob")}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.postBtnText}>Post Job</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: spacing.xl }}
        renderItem={({ item }) => {
          const needed = item.job.workersNeeded ?? 1;
          const filled = item.job.filled ?? 0;
          const accent = categoryColor[item.category];
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.jcCard, shadow.card]}
              onPress={() => navigation.navigate("Applicants", { job: item })}
            >
              {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.jcPhoto} />}
              <View style={styles.jcBody}>
                <View style={styles.jcTitleRow}>
                  <Text style={styles.jcTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <StatusPill status={item.status} />
                </View>

                <View style={styles.jcChips}>
                  <Chip small label={item.category} color={accent} bg={accent + "15"} />
                  <Text style={styles.jcPay}>
                    Rs. {item.pay.toLocaleString()} <Text style={styles.jcPayType}>· {item.job.payType}</Text>
                  </Text>
                </View>

                <View style={styles.jcMeta}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.jcMetaText} numberOfLines={1}>
                    {item.job.location}
                  </Text>
                </View>
                <View style={styles.jcMeta}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.jcMetaText} numberOfLines={1}>
                    {[item.job.date, item.job.time].filter(Boolean).join(" · ") || "Flexible"} · posted {item.postedAgo}
                  </Text>
                </View>

                <View style={styles.jcDivider} />

                <View style={styles.jcStats}>
                  <View style={styles.jcStat}>
                    <Ionicons name="people-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.jcStatText}>{item.applicants} applicants</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.lg }}>
                    <Text style={styles.jcStatText}>
                      {filled}/{needed} hired
                    </Text>
                    <View style={styles.jcBar}>
                      <View style={[styles.jcBarFill, { width: `${Math.min(100, (filled / needed) * 100)}%` }]} />
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: colors.successBg, color: colors.success },
    closed: { bg: colors.surfaceMuted, color: colors.textMuted },
    draft: { bg: colors.amberBg, color: colors.amber },
  };
  const c = map[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.color }]}>{status}</Text>
    </View>
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
  headerIcons: { flexDirection: "row", alignItems: "center" },
  statsRow: { flexDirection: "row", paddingHorizontal: spacing.xl, marginTop: spacing.lg, alignItems: "center" },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  statNum: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  postBtnText: { color: "#fff", fontWeight: "800", fontSize: 12, marginLeft: 4 },
  tabs: {
    flexDirection: "row",
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
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
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  jobTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.textDark, marginRight: spacing.sm },
  badgeRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  postedAgo: { fontSize: 11, color: colors.textMuted },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  pay: { fontSize: 13, fontWeight: "800", color: colors.primaryDark },
  applicants: { fontSize: 11, color: colors.textMuted },
  jcCard: { backgroundColor: "#fff", borderRadius: radius.lg, marginBottom: spacing.lg, overflow: "hidden" },
  jcPhoto: { width: "100%", height: 130, backgroundColor: colors.surfaceMuted },
  jcBody: { padding: spacing.md },
  jcTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  jcTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.textDark, marginRight: spacing.sm },
  jcChips: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm, marginBottom: spacing.sm },
  jcPay: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
  jcPayType: { fontSize: 11, fontWeight: "500", color: colors.textMuted },
  jcMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  jcMetaText: { flex: 1, fontSize: 12, color: colors.textMuted, marginLeft: 6 },
  jcDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  jcStats: { flexDirection: "row", alignItems: "center" },
  jcStat: { flexDirection: "row", alignItems: "center" },
  jcStatText: { fontSize: 12, fontWeight: "700", color: colors.textDark, marginLeft: 4 },
  jcBar: { height: 5, borderRadius: 3, backgroundColor: colors.surfaceMuted, marginTop: 4, marginLeft: 4, overflow: "hidden" },
  jcBarFill: { height: 5, borderRadius: 3, backgroundColor: colors.primary },
});
