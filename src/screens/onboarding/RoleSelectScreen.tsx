import React, { useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "../../theme/theme";
import Button from "../../components/Button";
import Chip from "../../components/Chip";

const ROLES = [
  {
    key: "worker",
    icon: "hammer",
    title: "I want to find work",
    desc: "Browse part-time jobs near you. Apply with one tap and track your applications & income.",
    tags: ["Gardening", "Cleaning", "Tutoring", "+7 more"],
  },
  {
    key: "employer",
    icon: "briefcase",
    title: "I want to hire someone",
    desc: "Post a job in minutes. Find verified workers nearby, fast, and free to post.",
    tags: ["Post Free", "Verified Workers", "Chat & Hire"],
  },
] as const;

export default function RoleSelectScreen({ navigation }: any) {
  const [role, setRole] = useState<"worker" | "employer">("worker");

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarker]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>How will you use{"\n"}JobLink LK?</Text>
        <Text style={styles.subtitle}>Choose your role to get started</Text>

        {ROLES.map((r) => {
          const selected = role === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              activeOpacity={0.85}
              onPress={() => setRole(r.key)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconWrap, selected && { backgroundColor: colors.primary }]}>
                  <Ionicons
                    name={r.icon as any}
                    size={20}
                    color={selected ? "#fff" : colors.primaryDark}
                  />
                </View>
                {selected && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </View>
              <Text style={styles.cardTitle}>{r.title}</Text>
              <Text style={styles.cardDesc}>{r.desc}</Text>
              <View style={styles.tagsRow}>
                {r.tags.map((t) => (
                  <Chip key={t} small label={t} style={{ marginRight: spacing.xs, marginTop: spacing.xs }} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        <Button
          label="Continue"
          icon="arrow-forward"
          style={{ marginTop: spacing.lg }}
          onPress={() => navigation.navigate("Register", { role })}
        />

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl }}>
          <Text style={{ color: colors.textOnDarkMuted, fontSize: 13 }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingTop: 70, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", lineHeight: 30 },
  subtitle: { fontSize: 13, color: colors.textOnDarkMuted, marginTop: spacing.sm, marginBottom: spacing.xl },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: { borderColor: colors.primary },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMint,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.textDark, marginTop: spacing.md },
  cardDesc: { fontSize: 13, color: colors.textBody, marginTop: spacing.xs, lineHeight: 18 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.sm },
});
