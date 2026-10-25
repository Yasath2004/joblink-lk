import React, { useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "../../theme/theme";
import Button from "../../components/Button";
import { categories, categoryIcon } from "../../data/mockData";
import { updateMyProfile } from "../../data/profileApi";

export default function SkillsSelectScreen({ navigation }: any) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (c: string) => {
    setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
    if (error) setError("");
  };

  const handleComplete = async () => {
    if (selected.length === 0) {
      setError("Select at least one skill to continue");
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({ skills: selected });
      navigation.replace("WorkerTabs");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarker]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.step}>Step 2 of 2</Text>
        <Text style={styles.title}>Select your skills</Text>

        <View style={styles.card}>
          <Text style={styles.hint}>
            Select all categories you can work in. You can update anytime.
          </Text>

          <View style={styles.grid}>
            {categories.map((c) => {
              const active = selected.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => toggle(c)}
                  style={[styles.item, active && styles.itemActive]}
                >
                  <Ionicons
                    name={categoryIcon[c] as any}
                    size={16}
                    color={active ? "#fff" : colors.primaryDark}
                  />
                  <Text style={[styles.itemText, active && { color: "#fff" }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Button
            label="Complete Setup"
            icon="checkmark"
            style={{ marginTop: spacing.md }}
            loading={saving}
            onPress={handleComplete}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingTop: 60, paddingBottom: 40 },
  backBtn: { marginBottom: spacing.lg },
  step: { fontSize: 12, color: colors.textOnDarkMuted, fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 4, marginBottom: spacing.xl },
  card: { backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.lg },
  hint: { fontSize: 13, color: colors.textBody, marginBottom: spacing.lg, lineHeight: 18 },
  errorText: { color: colors.urgent, fontSize: 12, fontWeight: "600", marginTop: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  item: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMint,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemText: { marginLeft: spacing.sm, fontSize: 13, fontWeight: "600", color: colors.textDark },
});
