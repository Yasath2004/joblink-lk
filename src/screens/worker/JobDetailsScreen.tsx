import React, { useEffect, useState } from "react";
import {
  Image,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { Job, categoryColor, categoryIcon } from "../../data/mockData";
import Chip from "../../components/Chip";
import Button from "../../components/Button";
import Avatar from "../../components/Avatar";
import { AppStatus, applyToJob, getApplicationStatus } from "../../data/jobsApi";
import { fetchUserRating } from "../../data/profileApi";
import { colorFor } from "../../data/util";

export default function JobDetailsScreen({ route, navigation }: any) {
  const job: Job = route.params.job;
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [applying, setApplying] = useState(false);
  const [empRating, setEmpRating] = useState({ rating: 0, reviews: 0 });

  useEffect(() => {
    getApplicationStatus(job.id).then(setAppStatus);
    if (job.employerId) fetchUserRating(job.employerId).then(setEmpRating);
  }, [job.id]);

  const apply = async () => {
    setApplying(true);
    try {
      await applyToJob(job.id);
      setAppStatus("pending");
    } catch (e: any) {
      Alert.alert("Could not apply", e.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="heart-outline" size={20} color={colors.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>
        {!!job.imageUrl && (
          <Image
            source={{ uri: job.imageUrl }}
            style={{ width: "100%", height: 190, borderRadius: radius.lg, marginBottom: spacing.lg }}
          />
        )}
        <View style={styles.headerRow}>
          <View
            style={[styles.iconWrap, { backgroundColor: categoryColor[job.category] + "20" }]}
          >
            <Ionicons name={categoryIcon[job.category] as any} size={22} color={categoryColor[job.category]} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.title}>{job.title}</Text>
            <View style={{ flexDirection: "row", marginTop: 6 }}>
              <Chip small label={job.category} color={categoryColor[job.category]} bg={categoryColor[job.category] + "15"} />
              {job.urgent && (
                <Chip small label="Urgent" color={colors.urgent} bg={colors.urgentBg} style={{ marginLeft: spacing.xs }} />
              )}
            </View>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoBox icon="cash-outline" label="PAY" value={`Rs. ${job.pay.toLocaleString()}`} sub={job.payType} />
          <InfoBox icon="calendar-outline" label="DATE" value={job.date || "Flexible"} />
          <InfoBox icon="location-outline" label="LOCATION" value={job.location} sub={job.distanceKm ? `${job.distanceKm} km away` : undefined} />
          <InfoBox icon="time-outline" label="TIME" value={job.time || "TBD"} />
          {job.workersNeeded != null && (
            <InfoBox
              icon="people-outline"
              label="WORKERS"
              value={`${job.filled ?? 0}/${job.workersNeeded} hired`}
              sub={
                job.workersNeeded - (job.filled ?? 0) > 0
                  ? `${job.workersNeeded - (job.filled ?? 0)} spot${job.workersNeeded - (job.filled ?? 0) > 1 ? "s" : ""} left`
                  : "Full"
              }
            />
          )}
          <InfoBox icon="timer-outline" label="POSTED" value={job.postedAgo} />
        </View>

        <Text style={styles.sectionTitle}>Job Description</Text>
        <Text style={styles.desc}>
          {job.description ||
            "Details about this job will be shared by the employer once you apply. Reach out via chat for more information."}
        </Text>

        {job.requirements && (
          <>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {job.requirements.map((r) => (
              <View key={r} style={styles.reqRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={styles.reqText}>{r}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>About the Employer</Text>
        <View style={styles.employerRow}>
          <Avatar name={job.employer?.name || "Employer"} color={colorFor(job.employer?.name || "E")} uri={job.employer?.avatarUrl} />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={styles.employerName}>{job.employer?.name || "JobLink Employer"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <Ionicons name="star" size={12} color={colors.star} />
              <Text style={styles.employerMeta}>
                {" "}
                {empRating.reviews > 0 ? `${empRating.rating} (${empRating.reviews} reviews)` : "No reviews yet"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() =>
              job.employerId &&
              navigation.navigate("Chat", { otherId: job.employerId, name: job.employer?.name || "Employer", avatarUrl: job.employer?.avatarUrl })
            }
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={
            appStatus === "accepted"
              ? "Accepted ✓"
              : appStatus === "rejected"
              ? "Declined"
              : appStatus === "pending"
              ? "Applied ✓"
              : "Apply Now"
          }
          variant={appStatus === "rejected" ? "outline" : "primary"}
          icon={appStatus ? undefined : "arrow-forward"}
          disabled={!!appStatus}
          loading={applying}
          onPress={apply}
        />
      </View>
    </SafeAreaView>
  );
}

function InfoBox({ icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <View style={styles.infoBox}>
      <View style={styles.infoIconRow}>
        <Ionicons name={icon} size={14} color={colors.primaryDark} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
      {sub && <Text style={styles.infoSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  iconWrap: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.xl, justifyContent: "space-between" },
  infoBox: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoIconRow: { flexDirection: "row", alignItems: "center" },
  infoLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "700", marginLeft: 4 },
  infoValue: { fontSize: 14, fontWeight: "800", color: colors.textDark, marginTop: 6 },
  infoSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.textDark, marginTop: spacing.lg, marginBottom: spacing.sm },
  desc: { fontSize: 13, color: colors.textBody, lineHeight: 20 },
  reqRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  reqText: { marginLeft: spacing.sm, fontSize: 13, color: colors.textBody },
  employerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  employerName: { fontSize: 14, fontWeight: "700", color: colors.textDark },
  employerMeta: { fontSize: 12, color: colors.textMuted },
  chatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMint,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
