import React, { useEffect } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "../../theme/theme";
import { getSessionRole } from "../../lib/auth";

export default function SplashScreen({ navigation }: any) {
  useEffect(() => {
    let cancelled = false;
    const go = async () => {
      // Already logged in? Skip straight to the right home. Otherwise ask for the role first.
      const [role] = await Promise.all([
        getSessionRole().catch(() => null),
        new Promise((r) => setTimeout(r, 1400)),
      ]);
      if (cancelled) return;
      if (role === "worker") navigation.replace("WorkerTabs");
      else if (role === "employer") navigation.replace("EmployerTabs");
      else navigation.replace("RoleSelect");
    };
    go();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarker]} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.bubbleTop} />
      <View style={styles.bubbleBottom} />

      <View style={styles.logoWrap}>
        <Ionicons name="briefcase" size={34} color={colors.bgDark} />
      </View>
      <Text style={styles.title}>JobLink LK</Text>
      <Text style={styles.subtitle}>Sri Lanka's Part-Time Job Marketplace</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  bubbleTop: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  bubbleBottom: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 13, color: colors.textOnDarkMuted, marginTop: spacing.xs },
});
