import React, { useEffect, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { Applicant, decideApplication } from "../../data/jobsApi";
import {
  fetchAcceptedCount,
  fetchProfileById,
  fetchReviews,
  fetchUserRating,
  Profile,
  ReviewItem,
} from "../../data/profileApi";
import { getOrCreateConversation } from "../../data/socialApi";
import { colorFor } from "../../data/util";
import Avatar from "../../components/Avatar";
import Chip from "../../components/Chip";
import Button from "../../components/Button";

// Employer view of an applicant's profile summary (opened from the Applicants list).
export default function ApplicantProfileScreen({ route, navigation }: any) {
  const { applicant, jobTitle }: { applicant: Applicant; jobTitle?: string } = route.params;
  const [status, setStatus] = useState(applicant.status);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accepted, setAccepted] = useState(0);
  const [rating, setRating] = useState({ rating: applicant.rating, reviews: applicant.reviews });
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchProfileById(applicant.workerId).then(setProfile);
    fetchAcceptedCount(applicant.workerId).then(setAccepted);
    fetchUserRating(applicant.workerId).then(setRating);
    fetchReviews(applicant.workerId).then(setReviews);
  }, [applicant.workerId]);

  const name = profile?.fullName || applicant.name;
  const location = profile?.location || applicant.location;
  const bio = profile?.bio || applicant.bio;
  const skills = profile?.skills?.length ? profile.skills : applicant.skills;
  const years = profile?.years ?? applicant.years;
  const joined = profile?.joined
    ? new Date(profile.joined).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : null;

  const decide = async (next: "accepted" | "rejected") => {
    setBusy(true);
    try {
      await decideApplication(applicant.applicationId, next);
      setStatus(next);
    } catch (e: any) {
      Alert.alert("Could not update", e.message);
    } finally {
      setBusy(false);
    }
  };

  const message = async () => {
    try {
      const conversationId = await getOrCreateConversation(applicant.workerId);
      navigation.navigate("Chat", { conversationId, name, avatarUrl: applicant.avatarUrl });
    } catch (e: any) {
      Alert.alert("Could not open chat", e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Applicant profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 130 }}>
        <View style={styles.top}>
          <Avatar name={name} color={colorFor(name)} uri={profile?.avatarUrl ?? applicant.avatarUrl} size={84} />
          <Text style={styles.name}>{name}</Text>
          {!!jobTitle && <Text style={styles.applied}>Applied for "{jobTitle}"</Text>}
          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color={colors.star} />
            <Text style={styles.meta}>
              {" "}
              {rating.reviews > 0 ? `${rating.rating} (${rating.reviews} reviews)` : "No reviews yet"}
            </Text>
          </View>
          {!!location && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.meta}> {location}</Text>
            </View>
          )}
          {!!joined && <Text style={[styles.meta, { marginTop: 2 }]}>Member since {joined}</Text>}
        </View>

        <View style={styles.statsRow}>
          <Stat value={String(accepted)} label="Jobs accepted" />
          <Stat value={String(rating.reviews)} label="Reviews" />
          <Stat value={years > 0 ? `${years}y` : "–"} label="Experience" />
        </View>

        <Text style={styles.section}>About</Text>
        <Text style={styles.body}>{bio || "This worker has not added a bio yet."}</Text>

        <Text style={styles.section}>Skills</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {skills.length ? (
            skills.map((s) => <Chip key={s} label={s} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }} />)
          ) : (
            <Text style={styles.body}>No skills added yet</Text>
          )}
        </View>

        <Text style={styles.section}>Reviews</Text>
        {reviews.length === 0 && <Text style={styles.body}>No reviews yet</Text>}
        {reviews.map((r) => (
          <View key={r.id} style={[styles.reviewCard, shadow.card]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Avatar name={r.name} color={colorFor(r.name)} size={30} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.reviewName}>{r.name}</Text>
                <Text style={styles.meta}>{r.date}</Text>
              </View>
              <View style={{ flexDirection: "row" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons key={i} name="star" size={12} color={i < r.rating ? colors.star : colors.border} />
                ))}
              </View>
            </View>
            {!!r.text && <Text style={[styles.body, { marginTop: spacing.sm }]}>{r.text}</Text>}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {status === "pending" ? (
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={styles.msgBtn} onPress={message}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.primaryDark} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
              <Button label="Decline" variant="outline" disabled={busy} onPress={() => decide("rejected")} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Accept" icon="checkmark" disabled={busy} onPress={() => decide("accepted")} />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity style={styles.msgBtn} onPress={message}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.primaryDark} />
            </TouchableOpacity>
            <View
              style={[
                styles.statusBox,
                { backgroundColor: status === "accepted" ? colors.successBg : colors.urgentBg },
              ]}
            >
              <Text style={{ fontWeight: "800", color: status === "accepted" ? colors.success : colors.urgent }}>
                {status === "accepted" ? "Accepted ✓" : "Declined"}
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.textDark },
  top: { alignItems: "center", marginBottom: spacing.lg },
  name: { fontSize: 20, fontWeight: "800", color: colors.textDark, marginTop: spacing.md },
  applied: { fontSize: 12, color: colors.primaryDark, fontWeight: "600", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  meta: { fontSize: 12, color: colors.textMuted },
  statsRow: { flexDirection: "row", marginBottom: spacing.lg },
  stat: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginHorizontal: 4,
  },
  statNum: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  section: { fontSize: 14, fontWeight: "800", color: colors.textDark, marginTop: spacing.lg, marginBottom: spacing.sm },
  body: { fontSize: 13, color: colors.textMuted, lineHeight: 19 },
  reviewCard: { backgroundColor: "#fff", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  reviewName: { fontSize: 13, fontWeight: "700", color: colors.textDark },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  msgBtn: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBox: { flex: 1, marginLeft: spacing.sm, height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
