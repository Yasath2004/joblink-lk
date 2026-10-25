import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { Job } from "../../data/mockData";
import { Applicant, decideApplication, fetchApplicants, fetchJobById, setJobStatus } from "../../data/jobsApi";
import { getOrCreateConversation } from "../../data/socialApi";
import { submitReview } from "../../data/profileApi";
import { colorFor } from "../../data/util";
import Avatar from "../../components/Avatar";
import Chip from "../../components/Chip";
import RateModal from "../../components/RateModal";

export default function ApplicantsScreen({ route, navigation }: any) {
  const job = route.params?.job;
  const [list, setList] = useState<Applicant[]>([]);
  const [rateFor, setRateFor] = useState<Applicant | null>(null);
  const [jobStatus, setStatus] = useState<string>(job?.status ?? "active");
  const [jobData, setJobData] = useState<Job | undefined>(job?.job);
  const needed: number = jobData?.workersNeeded ?? 1;

  const toggleJob = () => {
    const closing = jobStatus === "active";
    Alert.alert(
      closing ? "Close this job?" : "Reopen this job?",
      closing ? "Workers will no longer see it or be able to apply." : "Workers will be able to see it and apply again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: closing ? "Close job" : "Reopen",
          style: closing ? "destructive" : "default",
          onPress: async () => {
            try {
              await setJobStatus(job.id, closing ? "closed" : "active");
              setStatus(closing ? "closed" : "active");
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  const openProfile = (a: Applicant) => navigation.navigate("ApplicantProfile", { applicant: a, jobTitle: job?.title });

  useFocusEffect(
    useCallback(() => {
      if (job?.id) fetchApplicants(job.id).then(setList);
      if (job?.id)
        fetchJobById(job.id).then((r) => {
          if (!r) return;
          setJobData(r.job);
          setStatus(r.status);
        });
    }, [job?.id])
  );

  const decide = async (a: Applicant, status: "accepted" | "rejected") => {
    try {
      await decideApplication(a.applicationId, status);
      const next = list.map((x) => (x.applicationId === a.applicationId ? { ...x, status } : x));
      setList(next);
      // The database closes the job automatically once every position is filled
      if (status === "accepted" && next.filter((x) => x.status === "accepted").length >= needed) setStatus("closed");
    } catch (e: any) {
      Alert.alert("Could not update", e.message);
    }
  };

  const message = async (a: Applicant) => {
    try {
      const conversationId = await getOrCreateConversation(a.workerId);
      navigation.navigate("Chat", { conversationId, name: a.name, avatarUrl: a.avatarUrl });
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
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {jobData?.title ?? job?.title}
          </Text>
          <Text style={styles.applicantCount}>
            {list.length} applicants · {list.filter((x) => x.status === "accepted").length}/{needed} hired ·{" "}
            {jobStatus === "active" ? "Open" : "Closed"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => jobData && navigation.navigate("EditJob", { job: jobData })}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
            marginRight: spacing.sm,
          }}
        >
          <Ionicons name="create-outline" size={18} color={colors.textDark} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleJob}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: jobStatus === "active" ? colors.urgent : colors.primaryDark,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: jobStatus === "active" ? colors.urgent : colors.primaryDark }}>
            {jobStatus === "active" ? "Close job" : "Reopen"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(a) => a.applicationId}
        contentContainerStyle={{ padding: spacing.xl }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8 }}>No applicants yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, shadow.card]}>
            <TouchableOpacity style={styles.topRow} activeOpacity={0.7} onPress={() => openProfile(item)}>
              <Avatar name={item.name} color={colorFor(item.name)} uri={item.avatarUrl} size={44} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="star" size={12} color={colors.star} />
                  <Text style={styles.metaText}>
                    {" "}
                    {item.reviews > 0 ? `${item.rating} · ${item.reviews} reviews` : "No reviews yet"}
                    {item.years > 0 ? ` · ${item.years}y exp` : ""}
                  </Text>
                </View>
              </View>
              <Text style={styles.timeAgo}>{item.appliedAgo}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            {!!item.bio && <Text style={styles.bio}>{item.bio}</Text>}

            <View style={styles.skillsRow}>
              {item.skills.map((s) => (
                <Chip key={s} small label={s} style={{ marginRight: spacing.xs, marginTop: spacing.xs }} />
              ))}
            </View>

            <TouchableOpacity onPress={() => openProfile(item)} style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md }}>
              <Ionicons name="person-outline" size={14} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 12 }}> View profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => message(item)} style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.sm }}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 12 }}> Message</Text>
            </TouchableOpacity>

            {item.status === "pending" ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => decide(item, "rejected")}>
                  <Ionicons name="close" size={14} color={colors.urgent} />
                  <Text style={[styles.actionText, { color: colors.urgent }]}> Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => decide(item, "accepted")}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={[styles.actionText, { color: "#fff" }]}> Accept</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md }}>
                <View
                  style={[
                    styles.decisionBadge,
                    { backgroundColor: item.status === "accepted" ? colors.successBg : colors.urgentBg },
                  ]}
                >
                  <Text
                    style={{
                      color: item.status === "accepted" ? colors.success : colors.urgent,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {item.status === "accepted" ? "Accepted ✓" : "Declined"}
                  </Text>
                </View>
                {item.status === "accepted" && (
                  <TouchableOpacity onPress={() => setRateFor(item)} style={{ marginLeft: spacing.md }}>
                    <Text style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 12 }}>★ Rate worker</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      />

      <RateModal
        visible={!!rateFor}
        title={`Rate ${rateFor?.name ?? "worker"}`}
        onClose={() => setRateFor(null)}
        onSubmit={async (rating, comment) => {
          try {
            await submitReview(job.id, rateFor!.workerId, rating, comment);
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceMuted },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  jobTitle: { fontSize: 15, fontWeight: "800", color: colors.textDark },
  applicantCount: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  topRow: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 14, fontWeight: "700", color: colors.textDark },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  metaText: { fontSize: 11, color: colors.textMuted },
  timeAgo: { fontSize: 10, color: colors.textMuted },
  bio: { fontSize: 12, color: colors.textBody, marginTop: spacing.sm, lineHeight: 17 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.xs },
  actionsRow: { flexDirection: "row", marginTop: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    borderRadius: radius.md,
  },
  rejectBtn: { backgroundColor: colors.urgentBg, marginRight: spacing.sm },
  acceptBtn: { backgroundColor: colors.primary },
  actionText: { fontSize: 12, fontWeight: "700" },
  decisionBadge: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
});
