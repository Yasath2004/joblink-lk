import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "../../theme/theme";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useLanguage } from "../../i18n/LanguageContext";
import { signIn } from "../../lib/auth";

// Sri Lankan mobile format: 07X XXX XXXX (10 digits, starts with 07)
const PHONE_REGEX = /^07\d{8}$/;

export default function LoginScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: { phone?: string; password?: string } = {};
    const digitsOnly = phone.replace(/\s/g, "");
    if (!PHONE_REGEX.test(digitsOnly)) next.phone = t("invalid_phone");
    if (!password.trim()) next.password = t("password_required");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    // Supabase: log in, or create the account on first use.
    const res = await signIn(phone.replace(/\s/g, ""), password);
    setLoading(false);
    if (res.error) {
      setErrors({ password: res.error });
      return;
    }
    if (res.role === "worker") navigation.replace("WorkerTabs");
    else if (res.role === "employer") navigation.replace("EmployerTabs");
    else setErrors({ password: "Account profile not found. Please contact support." });
  };

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarker]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <Ionicons name="briefcase" size={28} color={colors.bgDark} />
          </View>
          <Text style={styles.title}>{t("welcome_back")}</Text>
          <Text style={styles.subtitle}>{t("sign_in_subtitle")}</Text>

          <View style={styles.card}>
            <Input
              label={t("phone_number")}
              icon="call-outline"
              placeholder={t("phone_placeholder")}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
              }}
              maxLength={10}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

            <Input
              label={t("password")}
              icon="lock-closed-outline"
              placeholder={t("password_placeholder")}
              secure
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <TouchableOpacity style={{ alignSelf: "flex-end", marginBottom: spacing.lg }}>
              <Text style={styles.forgot}>{t("forgot_password")}</Text>
            </TouchableOpacity>

            <Button label={t("login")} icon="arrow-forward" loading={loading} onPress={handleLogin} />
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>{t("no_account")}</Text>
            <TouchableOpacity onPress={() => navigation.navigate("RoleSelect")}>
              <Text style={styles.signupLink}>{t("sign_up")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: "center", padding: spacing.xl, paddingTop: 70 },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", alignSelf: "flex-start" },
  subtitle: {
    fontSize: 13,
    color: colors.textOnDarkMuted,
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  errorText: {
    color: colors.urgent,
    fontSize: 11,
    fontWeight: "600",
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  forgot: { fontSize: 12, color: colors.primaryDark, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 11, color: colors.textMuted, marginHorizontal: spacing.sm },
  signupRow: { flexDirection: "row", marginTop: spacing.xl },
  signupText: { color: colors.textOnDarkMuted, fontSize: 13 },
  signupLink: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
