import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import {
  fetchMyProfile,
  fetchReviews,
  fetchStats,
  fetchUserRating,
  Profile,
  ReviewItem,
} from "../../data/profileApi";
import { logoutAndReset } from "../../lib/auth";
import { colorFor } from "../../data/util";
import Chip from "../../components/Chip";
import Avatar from "../../components/Avatar";

export default function WorkerProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rating, setRating] = useState({ rating: 0, reviews: 0 });
  const [accepted, setAccepted] = useState(0);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchMyProfile().then((p) => {
        setProfile(p);
        if (!p) return;
        fetchUserRating(p.id).then(setRating);
        fetchStats(p.id).then((s) => setAccepted(s.workerAccepted));
        fetchReviews(p.id).then(setReviews);
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
            {!!profile?.location && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={styles.metaText}> {profile.location}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBox value={String(accepted)} label="Jobs Accepted" />
          <StatBox value={String(rating.reviews)} label="Reviews" />
          <StatBox value={rating.reviews > 0 ? `${rating.rating}★` : "–"} label="Avg Rating" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <TouchableOpacity onPress={() => navigation.navigate("ProfileSetup")}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chipsRow}>
          {profile?.skills.length ? (
            profile.skills.map((s) => (
              <Chip key={s} label={s} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }} />
            ))
          ) : (
            <Text style={styles.metaText}>No skills added yet</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Reviews</Text>
        {reviews.length === 0 && <Text style={[styles.metaText, { marginTop: spacing.sm }]}>No reviews yet</Text>}
        {reviews.map((r) => (
          <View key={r.id} style={[styles.reviewCard, shadow.card]}>
            <View style={styles.reviewTop}>
              <Avatar name={r.name} color={colorFor(r.name)} size={32} />
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Text style={styles.reviewName}>{r.name}</Text>
                <Text style={styles.reviewDate}>{r.date}</Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons key={i} name="star" size={12} color={i < r.rating ? colors.star : colors.border} />
                ))}
              </View>
            </View>
            {!!r.text && <Text style={styles.reviewText}>{r.text}</Text>}
          </View>
        ))}

        <TouchableOpacity style={logoutStyles.btn} onPress={() => logoutAndReset(navigation)}>
          <Ionicons name="log-out-outline" size={18} color={colors.urgent} />
          <Text style={logoutStyles.text}> Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const logoutStyles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.urgent,
  },
  text: { color: colors.urgent, fontWeight: "700", fontSize: 14 },
});

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={[styles.statBox, shadow.card]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.textDark, marginTop: spacing.xl, marginBottom: spacing.sm },
  editLink: { fontSize: 12, color: colors.primaryDark, fontWeight: "700" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap" },
  reviewCard: { backgroundColor: "#fff", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  reviewTop: { flexDirection: "row", alignItems: "center" },
  reviewName: { fontSize: 13, fontWeight: "700", color: colors.textDark },
  reviewDate: { fontSize: 11, color: colors.textMuted },
  reviewText: { fontSize: 12, color: colors.textBody, marginTop: spacing.sm, lineHeight: 17 },
});
