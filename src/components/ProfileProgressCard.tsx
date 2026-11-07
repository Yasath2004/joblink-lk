import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../theme/theme";
import { Progress } from "../data/verifyApi";

// "Your profile is 60% complete" card for the Home screens (worker and employer).
export default function ProfileProgressCard({ progress, onPress }: { progress: Progress | null; onPress: () => void }) {
  if (!progress) return null;
  const { percent, status } = progress;
  if (status === "verified" && percent >= 100) return null;

  const next = progress.items.find((i) => !i.done);

  if (status === "pending") {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, styles.pending, shadow.card]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.amberBg }]}>
          <Ionicons name="time-outline" size={20} color={colors.amber} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.title}>Verification under review</Text>
          <Text style={styles.sub}>We'll notify you as soon as your account is verified.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  const rejected = status === "rejected";
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, shadow.card]}>
      <View style={{ flex: 1 }}>
        <View style={styles.topRow}>
          <Ionicons
            name={rejected ? "alert-circle" : "shield-checkmark-outline"}
            size={18}
            color={rejected ? colors.urgent : colors.primaryDark}
          />
          <Text style={styles.title}>{rejected ? "Verification declined" : "Complete your profile"}</Text>
          <Text style={styles.percent}>{percent}%</Text>
        </View>
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${Math.max(4, percent)}%` }]} />
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {rejected
            ? "Tap to fix your details and submit again."
            : next
            ? `Next: ${next.label}`
            : "All set! Submit your account for verification."}
        </Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>{percent >= 100 ? "Submit" : "Continue"}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  pending: { borderWidth: 1, borderColor: colors.amberBg },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center" },
  title: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.textDark, marginLeft: 6 },
  percent: { fontSize: 14, fontWeight: "800", color: colors.primaryDark },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, marginVertical: spacing.sm, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  sub: { fontSize: 12, color: colors.textMuted },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: spacing.md,
  },
  ctaText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
