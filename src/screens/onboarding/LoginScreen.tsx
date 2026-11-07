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
import { isLkMobile, sendOtp } from "../../lib/auth";

export default function LoginScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!isLkMobile(phone)) {
      setError(t("invalid_phone"));
      return;
    }
    setError("");
    setLoading(true);
    const res = await sendOtp(phone, "login");
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigation.navigate("Otp", { phone, mode: "login" });
  };

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarker]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <Ionicons name="briefcase" size={28} color={colors.bgDark} />
          </View>
          <Text style={styles.title}>{t("welcome_back")}</Text>
          <Text style={styles.subtitle}>Enter your mobile number and we'll text you a 6-digit code.</Text>

          <View style={styles.card}>
            <Input
              label={t("phone_number")}
              icon="call-outline"
              placeholder={t("phone_placeholder")}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                if (error) setError("");
              }}
              maxLength={12}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Button label="Send OTP" icon="arrow-forward" loading={loading} onPress={handleSend} />

            <View style={styles.secure}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
              <Text style={styles.secureText}>No password needed. Standard SMS rates may apply.</Text>
            </View>
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
  card: { width: "100%", backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.lg },
  errorText: {
    color: colors.urgent,
    fontSize: 11,
    fontWeight: "600",
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  secure: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  secureText: { fontSize: 11, color: colors.textMuted, marginLeft: 6 },
  signupRow: { flexDirection: "row", marginTop: spacing.xl },
  signupText: { color: colors.textOnDarkMuted, fontSize: 13 },
  signupLink: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
