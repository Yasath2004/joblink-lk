import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "../../components/SafeScreen";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { PostedJob } from "../../data/mockData";
import { fetchMyJobs } from "../../data/jobsApi";
import { fetchMyProfile, fetchStats, fetchUserRating, Profile, ProfileStats } from "../../data/profileApi";
import { logoutAndReset } from "../../lib/auth";
import { MenuCard, MenuRow, ProfileHero, Section, StatsStrip, verifyHint } from "../../components/ProfileParts";

const PILL: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: colors.successBg, color: colors.success, label: "Active" },
  closed: { bg: colors.surfaceMuted, color: colors.textMuted, label: "Closed" },
  draft: { bg: colors.amberBg, color: colors.amber, label: "Draft" },
};

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

  const name = profile?.businessName || profile?.fullName || "My Profile";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.gear} onPress={() => navigation.navigate("Settings")}>
          <Ionicons name="settings-outline" size={19} color={colors.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileHero
          name={name}
          avatarUrl={profile?.avatarUrl}
          location={profile?.location}
          rating={rating.rating}
          reviews={rating.reviews}
          onEdit={() => navigation.navigate("CompleteProfile", { step: 0 })}
          verified={profile?.verification === "verified"}
        />

        <StatsStrip
          items={[
            { value: String(stats.employerPosted), label: "Jobs posted" },
            { value: String(stats.employerHired), label: "Total hired" },
            { value: rating.reviews > 0 ? rating.rating.toFixed(1) : "–", label: "Avg rating", star: rating.reviews > 0 },
          ]}
        />

        <Section title="Recent postings" action={postedJobs.length > 3 ? "See all" : undefined} onAction={() => navigation.navigate("MyJobs")}>
          {postedJobs.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="briefcase-outline" size={26} color={colors.textMuted} />
              <Text style={styles.emptyText}>You haven't posted any jobs yet</Text>
            </View>
          ) : (
            <View style={[styles.card, shadow.card]}>
              {postedJobs.slice(0, 3).map((j, i) => {
                const pill = PILL[j.status] ?? PILL.active;
                return (
                  <TouchableOpacity
                    key={j.id}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate("Applicants", { job: j })}
                    style={[styles.jobRow, i > 0 && styles.divider]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobTitle} numberOfLines={1}>
                        {j.title}
                      </Text>
                      <Text style={styles.jobMeta}>
                        {j.applicants} applicants · {j.job.filled ?? 0}/{j.job.workersNeeded ?? 1} hired
                      </Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.pillText, { color: pill.color }]}>{pill.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Section>

        <Section title="Account">
          <MenuCard>
            <MenuRow
              icon="shield-checkmark-outline"
              label="Verify account"
              hint={verifyHint(profile?.verification).text}
              hintColor={verifyHint(profile?.verification).color}
              onPress={() => navigation.navigate("VerificationHub")}
            />
            <MenuRow icon="create-outline" label="Edit business profile" onPress={() => navigation.navigate("CompleteProfile", { step: 0 })} />
            <MenuRow icon="settings-outline" label="Settings" onPress={() => navigation.navigate("Settings")} />
            <MenuRow icon="log-out-outline" label="Log out" danger last onPress={() => logoutAndReset(navigation)} />
          </MenuCard>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.textDark },
  gear: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: spacing.xl, paddingTop: spacing.md, paddingBottom: 40 },
  emptyBox: { alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, paddingVertical: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, overflow: "hidden" },
  jobRow: { flexDirection: "row", alignItems: "center", padding: spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  jobTitle: { fontSize: 14, fontWeight: "700", color: colors.textDark },
  jobMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  pill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginLeft: spacing.md },
  pillText: { fontSize: 11, fontWeight: "700" },
});
