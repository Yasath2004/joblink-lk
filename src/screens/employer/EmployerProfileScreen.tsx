import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { PostedJob } from "../../data/mockData";
import { fetchMyJobs } from "../../data/jobsApi";
import { fetchMyProfile, fetchStats, fetchUserRating, Profile, ProfileStats } from "../../data/profileApi";
import { logoutAndReset } from "../../lib/auth";
import { colorFor } from "../../data/util";
import Avatar from "../../components/Avatar";

export default function EmployerProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rating, setRating] = useState({ rating: 0, reviews: 0 });
  const [stats, setStats] = useState<ProfileStats>({ workerAccepted: 0, employerPosted: 0, employerHired: 0 });
  const [postedJobs, setPostedJobs] = useState<PostedJob[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchMyJobs().then(setPostedJobs);
      fetchMyProfile().then((p) => {
        setProfile(p);
        if (!p) return;
        fetchUserRating(p.id).then(setRating);
        fetchStats(p.id).then(setStats);
      });
    }, [])
  );

  const name = profile?.fullName || "My Profile";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <Ionicons name="settings-outline" size={20} color={colors.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 }}>
        <View style={styles.profileRow}>
          <Avatar name={name} color={colorFor(name)} uri={profile?.avatarUrl} size={56} />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={styles.name}>{name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <Ionicons name="star" size={12} color={colors.star} />
              <Text style={styles.metaText}>
                {" "}
                {rating.reviews > 0 ? `${rating.rating} (${rating.reviews} reviews)` : "No reviews yet"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBox value={String(stats.employerPosted)} label="Jobs Posted" />
          <StatBox value={String(stats.employerHired)} label="Total Hired" />
          <StatBox value={rating.reviews > 0 ? `${rating.rating}★` : "–"} label="Avg Rating" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Postings</Text>
        </View>
        <View style={[styles.card, shadow.card]}>
          {postedJobs.length === 0 && <Text style={styles.jobMeta}>You haven't posted any jobs yet.</Text>}
          {postedJobs.slice(0, 3).map((j, i) => (
            <View key={j.id} style={[styles.jobRow, i > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle}>{j.title}</Text>
                <Text style={styles.jobMeta}>{j.applicants} applicants</Text>
              </View>
              <StatusPill status={j.status} />
            </View>
          ))}
        </View>

        <View style={[styles.card, shadow.card, { marginTop: spacing.xl }]}>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("Settings")}>
            <Ionicons name="settings-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.linkText}>Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.linkRow} onPress={() => logoutAndReset(navigation)}>
            <Ionicons name="log-out-outline" size={18} color={colors.urgent} />
            <Text style={[styles.linkText, { color: colors.urgent }]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={[styles.statBox, shadow.card]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  profileRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg },
  name: { fontSize: 17, fontWeight: "800", color: colors.textDark },
  metaText: { fontSize: 12, color: colors.textMuted },
  statsRow: { flexDirection: "row", marginTop: spacing.xl },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    alignItems: "center",
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
  },
  statValue: { fontSize: 16, fontWeight: "800", color: colors.primaryDark },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  sectionHeader: { marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.textDark },
  card: { backgroundColor: "#fff", borderRadius: radius.md, overflow: "hidden" },
  jobRow: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  jobTitle: { fontSize: 13, fontWeight: "700", color: colors.textDark },
  jobMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  linkRow: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  linkText: { flex: 1, marginLeft: spacing.md, fontSize: 13, fontWeight: "600", color: colors.textDark },
});
