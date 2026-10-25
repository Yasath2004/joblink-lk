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
import { register, Role } from "../../lib/auth";

export default function RegisterScreen({ navigation, route }: any) {
  const role: Role = route?.params?.role === "employer" ? "employer" : "worker";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!/^0\d{9}$/.test(phone.replace(/\s/g, ""))) e.phone = "Enter a valid phone number (07X XXX XXXX)";
    if (password.length < 6) e.password = "Password must be at least 6 characters";
    if (confirm !== password) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    const res = await register({ name, phone, password, role });
    setLoading(false);
    if (res.error) {
      setErrors({ phone: res.error });
      return;
    }
    navigation.replace(role === "worker" ? "ProfileSetup" : "EmployerTabs");
  };

  const err = (k: string) => (errors[k] ? <Text style={styles.errorText}>{errors[k]}</Text> : null);

  return (
    <LinearGradient colors={[colors.bgDark, colors.bgDarker]} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.title}>Create your account</Text>
          <View style={styles.roleBadge}>
            <Ionicons name={role === "worker" ? "construct" : "business"} size={13} color={colors.bgDark} />
            <Text style={styles.roleText}>
              {role === "worker" ? "I'm looking for work" : "I'm hiring"}
            </Text>
          </View>

          <View style={styles.card}>
            <Input
              label="Full Name"
              icon="person-outline"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
            />
            {err("name")}
            <Input
              label="Phone Number"
              icon="call-outline"
              placeholder="07X XXX XXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            {err("phone")}
            <Input
              label="Password"
              icon="lock-closed-outline"
              placeholder="At least 6 characters"
              secure
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            {err("password")}
            <Input
              label="Confirm Password"
              icon="lock-closed-outline"
              placeholder="Re-enter password"
              secure
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="none"
            />
            {err("confirm")}
            <Button label="Create Account" icon="arrow-forward" loading={loading} onPress={submit} />
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Log in</Text>
            </TouchableOpacity>
          </View>
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
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  roleText: { fontSize: 12, fontWeight: "700", color: colors.bgDark, marginLeft: 5 },
  card: { backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.lg },
  errorText: {
    color: colors.urgent,
    fontSize: 11,
    fontWeight: "600",
    marginTop: -spacing.md,
    marginBottom: spacing.md,
  },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl },
  loginText: { color: colors.textOnDarkMuted, fontSize: 13 },
  loginLink: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
