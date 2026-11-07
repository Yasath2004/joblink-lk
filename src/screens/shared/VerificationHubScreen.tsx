import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "../../components/SafeScreen";
import { colors, radius, shadow, spacing } from "../../theme/theme";
import { fetchProgress, Progress, STEP_OF } from "../../data/verifyApi";
import Button from "../../components/Button";

const BENEFITS: Record<string, string[]> = {
  worker: [
    "A blue verified badge next to your name",
    "Employers trust verified workers and hire them faster",
    "Your identity details stay private",
  ],
  employer: [
    "A blue verified badge on all your job ads",
    "Workers trust verified employers and apply more",
    "Your identity details stay private",
  ],
};

export default function VerificationHubScreen({ navigation }: any) {
  const [progress, setProgress] = useState<Progress | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchProgress().then(setProgress);
    }, [])
  );

  const go = (step: number) => navigation.navigate("CompleteProfile", { step });

  const items = progress?.items ?? [];
  const done = (k: string) => items.find((i) => i.key === k)?.done ?? false;
  const readyToSubmit = done("email") && done("nic") && done("docs");
  const firstTodo = items.find((i) => !i.done);
  const status = progress?.status ?? "unverified";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Verify your account</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 }}>
        {/* Status */}
        {status === "verified" && (
          <View style={[styles.status, { backgroundColor: colors.successBg }]}>
            <Ionicons name="shield-checkmark" size={26} color="#2563EB" />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[styles.statusTitle, { color: colors.success }]}>Your account is verified</Text>
              <Text style={styles.statusSub}>A verified badge shows on your profile.</Text>
            </View>
          </View>
        )}
        {status === "pending" && (
          <View style={[styles.status, { backgroundColor: colors.amberBg }]}>
            <Ionicons name="time" size={26} color={colors.amber} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[styles.statusTitle, { color: colors.amber }]}>Under review</Text>
              <Text style={styles.statusSub}>We are checking your details. We'll notify you when it's done.</Text>
            </View>
          </View>
        )}
        {status === "rejected" && (
          <View style={[styles.status, { backgroundColor: colors.urgentBg }]}>
            <Ionicons name="alert-circle" size={26} color={colors.urgent} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[styles.statusTitle, { color: colors.urgent }]}>Verification declined</Text>
              <Text style={styles.statusSub}>
                {progress?.reviewNote ? `Reason: ${progress.reviewNote}` : "Please check your details and photos."}
              </Text>
            </View>
          </View>
        )}

        {/* Percentage */}
        <View style={[styles.card, shadow.card]}>
          <View style={styles.pctRow}>
            <Text style={styles.pct}>{progress?.percent ?? 0}%</Text>
            <Text style={styles.pctLabel}>profile complete</Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${Math.max(3, progress?.percent ?? 0)}%` }]} />
          </View>
          {status === "unverified" && (
            <View style={{ marginTop: spacing.md }}>
              {(BENEFITS[progress?.role ?? "worker"] ?? BENEFITS.worker).map((b) => (
                <View key={b} style={styles.benefit}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Checklist */}
        <Text style={styles.section}>Your checklist</Text>
        <View style={[styles.card, shadow.card, { padding: 0, overflow: "hidden" }]}>
          {items.map((it, i) => (
            <TouchableOpacity
              key={it.key}
              activeOpacity={0.7}
              onPress={() => go(STEP_OF[it.key] ?? 0)}
              style={[styles.row, i > 0 && styles.rowDivider]}
            >
              <Ionicons
                name={it.done ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={it.done ? colors.success : colors.border}
              />
              <Text style={[styles.rowLabel, it.done && { color: colors.textMuted }]}>{it.label}</Text>
              {!it.done && <Text style={styles.rowWeight}>+{it.weight}%</Text>}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.privacy}>
          🔒 Your email, NIC number and photos are private. Only our verification team can see them. They are never shown to
          other users.
        </Text>

        {(status === "unverified" || status === "rejected") && (
          <Button
            label={readyToSubmit ? "Review & submit for verification" : "Continue"}
            icon="arrow-forward"
            onPress={() => go(readyToSubmit ? 2 : STEP_OF[firstTodo?.key ?? "photo"] ?? 0)}
          />
        )}
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
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "800", color: colors.textDark },
  status: { flexDirection: "row", alignItems: "center", borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  statusTitle: { fontSize: 15, fontWeight: "800" },
  statusSub: { fontSize: 12, color: colors.textBody, marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.lg },
  pctRow: { flexDirection: "row", alignItems: "flex-end" },
  pct: { fontSize: 34, fontWeight: "800", color: colors.textDark },
  pctLabel: { fontSize: 13, color: colors.textMuted, marginLeft: 8, marginBottom: 6 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, marginTop: spacing.sm, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  benefit: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  benefitText: { fontSize: 12, color: colors.textBody, marginLeft: 8, flex: 1 },
  section: { fontSize: 16, fontWeight: "800", color: colors.textDark, marginTop: spacing.xl, marginBottom: spacing.md },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textDark, marginLeft: spacing.md },
  rowWeight: { fontSize: 12, fontWeight: "800", color: colors.primaryDark, marginRight: 8 },
  privacy: { fontSize: 11, color: colors.textMuted, lineHeight: 17, marginVertical: spacing.lg },
});
