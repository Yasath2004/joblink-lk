import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "../../components/SafeScreen";
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
import { MenuCard, MenuRow, ProfileHero, Section, StatsStrip, verifyHint } from "../../components/ProfileParts";

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
  const edit = () => navigation.navigate("CompleteProfile", { step: 0 });

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
          onEdit={edit}
          verified={profile?.verification === "verified"}
        />

        <StatsStrip
          items={[
            { value: String(accepted), label: "Jobs accepted" },
            { value: String(rating.reviews), label: "Reviews" },
            { value: rating.reviews > 0 ? rating.rating.toFixed(1) : "–", label: "Avg rating", star: rating.reviews > 0 },
          ]}
        />

        {!!profile?.bio && (
          <Section title="About">
            <Text style={styles.body}>{profile.bio}</Text>
          </Section>
        )}

        <Section title="Skills" action="Edit" onAction={edit}>
          {profile?.skills.length ? (
            <View style={styles.chips}>
              {profile.skills.map((s) => (
                <Chip key={s} label={s} style={{ marginRight: spacing.sm, marginBottom: spacing.sm }} />
              ))}
            </View>
          ) : (
            <Text style={styles.body}>No skills added yet. Tap Edit to add some.</Text>
          )}
        </Section>

        <Section title={`Reviews${reviews.length ? ` (${reviews.length})` : ""}`}>
          {reviews.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.textMuted} />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={[styles.reviewCard, shadow.card]}>
                <View style={styles.reviewTop}>
                  <Avatar name={r.name} color={colorFor(r.name)} size={36} />
                  <View style={{ marginLeft: spacing.md, flex: 1 }}>
                    <Text style={styles.reviewName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.reviewDate}>{r.date}</Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons key={i} name="star" size={13} color={i < r.rating ? colors.star : colors.border} />
                    ))}
                  </View>
                </View>
                {!!r.text && <Text style={styles.reviewText}>{r.text}</Text>}
              </View>
            ))
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
            <MenuRow icon="create-outline" label="Edit profile" onPress={() => navigation.navigate("CompleteProfile", { step: 0 })} />
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
  chips: { flexDirection: "row", flexWrap: "wrap" },
  body: { fontSize: 13, color: colors.textBody, lineHeight: 20 },
  emptyBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
  },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  reviewCard: { backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  reviewTop: { flexDirection: "row", alignItems: "center" },
  reviewName: { fontSize: 14, fontWeight: "700", color: colors.textDark },
  reviewDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  reviewText: { fontSize: 13, color: colors.textBody, marginTop: spacing.md, lineHeight: 19 },
});
