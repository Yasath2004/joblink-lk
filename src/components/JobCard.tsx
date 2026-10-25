import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Job, categoryColor, categoryIcon } from "../data/mockData";
import { colors, radius, shadow, spacing } from "../theme/theme";
import Chip from "./Chip";
import { AppStatus } from "../data/jobsApi";

const STATUS_LOOK: Record<AppStatus, { label: string; bg: string; color: string }> = {
  pending: { label: "Applied", bg: colors.amberBg, color: colors.amber },
  accepted: { label: "Accepted", bg: colors.successBg, color: colors.success },
  rejected: { label: "Declined", bg: colors.urgentBg, color: colors.urgent },
};

export default function JobCard({ job, onPress, status }: { job: Job; onPress?: () => void; status?: AppStatus }) {
  const accent = categoryColor[job.category];
  const look = status ? STATUS_LOOK[status] : null;
  const badge = look && (
    <View style={[styles.statusBadge, { backgroundColor: look.bg }]}>
      <Text style={[styles.statusText, { color: look.color }]}>{look.label}</Text>
    </View>
  );
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, shadow.card]}>
      {!!job.imageUrl && (
        <View>
          <Image source={{ uri: job.imageUrl }} style={styles.photo} resizeMode="cover" />
          {!!badge && <View style={styles.badgeOnPhoto}>{badge}</View>}
          {job.urgent && (
            <View style={styles.urgentTag}>
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: accent + "20" }]}>
          <Ionicons name={categoryIcon[job.category] as any} size={20} color={accent} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={2}>
              {job.title}
            </Text>
            <Text style={styles.pay}>Rs. {job.pay.toLocaleString()}</Text>
          </View>

          <View style={styles.tagsRow}>
            <Chip small label={job.category} color={accent} bg={accent + "15"} />
            {job.urgent && !job.imageUrl && (
              <Chip small label="Urgent" color={colors.urgent} bg={colors.urgentBg} style={{ marginLeft: spacing.xs }} />
            )}
            <Text style={styles.payType}>{job.payType}</Text>
            {!job.imageUrl && !!badge && <View style={{ marginLeft: "auto" }}>{badge}</View>}
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {job.location} · {job.postedAgo}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {job.workersNeeded != null && (
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                  <Text style={styles.metaText}>
                    {job.filled ?? 0}/{job.workersNeeded} hired
                  </Text>
                </View>
              )}
              {job.rating > 0 && (
                <View style={[styles.metaItem, { marginLeft: spacing.sm }]}>
                  <Ionicons name="star" size={12} color={colors.star} />
                  <Text style={styles.metaText}>{job.rating}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  photo: { width: "100%", height: 160, backgroundColor: colors.surfaceMuted },
  urgentTag: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: colors.urgent,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "800" },
  badgeOnPhoto: { position: "absolute", top: 10, right: 10 },
  body: { flexDirection: "row", padding: spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.textDark, marginRight: spacing.sm },
  pay: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
  tagsRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
  payType: { fontSize: 11, color: colors.textMuted, marginLeft: spacing.sm },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  metaItem: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  metaText: { fontSize: 11, color: colors.textMuted, marginLeft: 4 },
});
