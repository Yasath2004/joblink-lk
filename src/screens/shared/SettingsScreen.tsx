import React, { useState } from "react";
import { ScrollView, SafeAreaView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../../theme/theme";
import { useLanguage } from "../../i18n/LanguageContext";
import { languages } from "../../i18n/translations";

const ITEM_KEYS = [
  { icon: "person-outline", key: "edit_profile" },
  { icon: "shield-checkmark-outline", key: "privacy_security" },
  { icon: "card-outline", key: "payment_methods" },
  { icon: "help-circle-outline", key: "help_support" },
  { icon: "flag-outline", key: "report_issue" },
] as const;

export default function SettingsScreen({ navigation }: any) {
  const { lang, setLang, t } = useLanguage();
  const [push, setPush] = useState(true);
  const [locationAccess, setLocationAccess] = useState(true);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("settings")}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
        <Text style={styles.sectionLabel}>{t("language")}</Text>
        <View style={styles.langRow}>
          {languages.map((l) => (
            <TouchableOpacity
              key={l.code}
              onPress={() => setLang(l.code)}
              style={[styles.langBox, lang === l.code && styles.langBoxActive]}
            >
              <Text style={[styles.langCode, lang === l.code && { color: colors.primaryDark }]}>
                {l.code}
              </Text>
              <Text style={[styles.langLabel, lang === l.code && { color: colors.primaryDark }]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>{t("notifications_privacy")}</Text>
        <View style={styles.card}>
          <ToggleRow
            label={t("push_notifications")}
            sub={t("push_notifications_sub")}
            value={push}
            onChange={setPush}
          />
          <View style={styles.divider} />
          <ToggleRow
            label={t("location_access")}
            sub={t("location_access_sub")}
            value={locationAccess}
            onChange={setLocationAccess}
          />
        </View>

        <View style={[styles.card, { marginTop: spacing.xl }]}>
          {ITEM_KEYS.map((item, i) => (
            <TouchableOpacity key={item.key} style={[styles.itemRow, i > 0 && styles.divider]}>
              <Ionicons name={item.icon as any} size={18} color={colors.primaryDark} />
              <Text style={styles.itemLabel}>{t(item.key)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>JobLink LK v1.0.0{"\n"}Made with ❤️ in Sri Lanka</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
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
  title: { fontSize: 16, fontWeight: "800", color: colors.textDark },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.sm },
  langRow: { flexDirection: "row" },
  langBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    alignItems: "center",
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  langBoxActive: { borderColor: colors.primary, backgroundColor: colors.surfaceMint },
  langCode: { fontSize: 14, fontWeight: "800", color: colors.textDark },
  langLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  card: { backgroundColor: "#fff", borderRadius: radius.md, overflow: "hidden" },
  toggleRow: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  toggleLabel: { fontSize: 13, fontWeight: "700", color: colors.textDark },
  toggleSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  itemRow: { flexDirection: "row", alignItems: "center", padding: spacing.md },
  itemLabel: { flex: 1, marginLeft: spacing.md, fontSize: 13, fontWeight: "600", color: colors.textDark },
  version: { textAlign: "center", fontSize: 11, color: colors.textMuted, marginTop: spacing.xxl, lineHeight: 18 },
});
