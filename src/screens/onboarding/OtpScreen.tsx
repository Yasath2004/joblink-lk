import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing } from "../../theme/theme";
import Button from "../../components/Button";
import { createProfile, formatPhone, Role, sendOtp, verifyOtp } from "../../lib/auth";

const LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpScreen({ navigation, route }: any) {
  const { phone, mode, role, name } = route.params as {
    phone: string;
    mode: "login" | "register";
    role?: Role;
    name?: string;
  };

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // resend countdown
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  // verify automatically when all 6 digits are typed
  useEffect(() => {
    if (code.length === LENGTH) submit(code);
  }, [code]);

  const submit = async (value: string) => {
    if (loading) return;
    setLoading(true);
    setError("");
    const res = await verifyOtp(phone, value);
    if (res.error) {
      setLoading(false);
      setError(res.error);
      setCode("");
      inputRef.current?.focus();
      return;
    }

    let finalRole = res.role ?? null;
    let isNew = false;
    // brand new account: create its profile (name + role) now that the phone is confirmed
    if (!finalRole && mode === "register" && role && name) {
      try {
        await createProfile(name, role);
        finalRole = role;
        isNew = true;
      } catch (e: any) {
        setLoading(false);
        setError(e.message ?? "Could not create your account");
        return;
      }
    }
    setLoading(false);

    // clear the history so Back never returns to the OTP screen
    const go = (routeName: string) => navigation.reset({ index: 0, routes: [{ name: routeName }] });
    if (finalRole === "worker") go(isNew ? "ProfileSetup" : "WorkerTabs");
    else if (finalRole === "employer") go("EmployerTabs");
    else go("RoleSelect"); // logged in, but no profile yet
  };

  const resend = async () => {
    setError("");
    setInfo("");
    const res = await sendOtp(phone, mode);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSeconds(RESEND_SECONDS);
    setInfo("A new code was sent.");
  };

  const digits = code.split("");
  const active = Math.min(code.length, LENGTH - 1);

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarker]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="chatbubble-ellipses" size={26} color={colors.bgDark} />
          </View>
          <Text style={styles.title}>Enter the code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to <Text style={styles.phone}>{formatPhone(phone)}</Text>
          </Text>

          <View style={styles.card}>
            <View style={styles.boxesWrap}>
              <View style={styles.boxes}>
                {Array.from({ length: LENGTH }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.box, i === active && !loading && styles.boxActive, !!error && styles.boxError]}
                  >
                    <Text style={styles.digit}>{digits[i] ?? ""}</Text>
                  </View>
                ))}
              </View>
              {/* invisible input that receives the typing (and SMS autofill) */}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/\D/g, "").slice(0, LENGTH));
                  if (error) setError("");
                }}
                keyboardType="number-pad"
                maxLength={LENGTH}
                autoFocus
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                caretHidden
                style={styles.hiddenInput}
              />
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}
            {!!info && !error && <Text style={styles.infoText}>{info}</Text>}

            <Button
              label="Verify"
              icon="checkmark"
              loading={loading}
              disabled={code.length < LENGTH}
              onPress={() => submit(code)}
              style={{ marginTop: spacing.lg }}
            />

            <View style={styles.resendRow}>
              {seconds > 0 ? (
                <Text style={styles.resendWait}>
                  Resend code in 0:{String(seconds).padStart(2, "0")}
                </Text>
              ) : (
                <TouchableOpacity onPress={resend}>
                  <Text style={styles.resendLink}>Didn't get it? Resend code</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }}>
            <Text style={styles.change}>Wrong number? Change it</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: spacing.xl, paddingTop: 60 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 13, color: colors.textOnDarkMuted, marginTop: 6, marginBottom: spacing.xl, lineHeight: 19 },
  phone: { color: "#fff", fontWeight: "800" },
  card: { backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.lg },
  boxesWrap: { position: "relative" },
  boxes: { flexDirection: "row", justifyContent: "space-between" },
  box: {
    width: 46,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  boxActive: { borderColor: colors.primary, backgroundColor: "#fff" },
  boxError: { borderColor: colors.urgent },
  digit: { fontSize: 22, fontWeight: "800", color: colors.textDark },
  hiddenInput: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: "transparent" },
  errorText: { color: colors.urgent, fontSize: 12, fontWeight: "600", marginTop: spacing.md, textAlign: "center" },
  infoText: { color: colors.success, fontSize: 12, fontWeight: "600", marginTop: spacing.md, textAlign: "center" },
  resendRow: { alignItems: "center", marginTop: spacing.lg },
  resendWait: { fontSize: 12, color: colors.textMuted },
  resendLink: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },
  change: { color: colors.textOnDarkMuted, fontSize: 13, textAlign: "center" },
});
