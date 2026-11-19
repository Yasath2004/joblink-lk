import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "../../theme/theme";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { setPassword } from "../../lib/auth";

// Shown once, right after the first OTP (or after a password reset).
// From now on the user logs in with phone + password - no more SMS codes.
export default function SetPasswordScreen({ navigation, route }: any) {
  const next: string = route?.params?.next ?? "RoleSelect";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (pw.length < 6) return setError("Password must be at least 6 characters.");
    if (pw !== pw2) return setError("The two passwords do not match.");
    setError("");
    setLoading(true);
    const res = await setPassword(pw);
    setLoading(false);
    if (res.error) return setError(res.error);
    navigation.reset({ index: 0, routes: [{ name: next }] });
  };

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarker]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={26} color={colors.bgDark} />
          </View>
          <Text style={styles.title}>Create a password</Text>
          <Text style={styles.subtitle}>
            Your number is confirmed. Next time you can log in with this password - no OTP code needed.
          </Text>

          <View style={styles.card}>
            <Input label="Password" icon="lock-closed-outline" placeholder="At least 6 characters" secure
              autoCapitalize="none" value={pw} onChangeText={(v) => { setPw(v); if (error) setError(""); }} />
            <Input label="Confirm password" icon="lock-closed-outline" placeholder="Type it again" secure
              autoCapitalize="none" value={pw2} onChangeText={(v) => { setPw2(v); if (error) setError(""); }} />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <Button label="Save & continue" icon="arrow-forward" loading={loading} onPress={submit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: 80 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 13, color: colors.textOnDarkMuted, marginTop: 6, marginBottom: spacing.xl, lineHeight: 19 },
  card: { backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.lg },
  errorText: { color: colors.urgent, fontSize: 12, fontWeight: "600", marginTop: -spacing.md, marginBottom: spacing.md },
});
