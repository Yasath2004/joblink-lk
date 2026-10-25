import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/theme";

interface Props extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  hint?: string;
  dark?: boolean;
}

export default function Input({ label, icon, secure, hint, dark, style, ...rest }: Props) {
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label && (
        <Text style={[styles.label, dark && { color: colors.textOnDark }]}>{label}</Text>
      )}
      <View style={[styles.wrap, dark && styles.wrapDark]}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={dark ? colors.textOnDarkMuted : colors.textMuted}
            style={{ marginRight: spacing.sm }}
          />
        )}
        <TextInput
          placeholderTextColor={dark ? colors.textOnDarkMuted : colors.textMuted}
          secureTextEntry={hidden}
          style={[styles.input, dark && { color: colors.textOnDark }, style]}
          {...rest}
        />
        {secure && (
          <TouchableOpacity onPress={() => setHidden(!hidden)}>
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={18}
              color={dark ? colors.textOnDarkMuted : colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.textDark, marginBottom: spacing.sm },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  wrapDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  input: { flex: 1, fontSize: 14, color: colors.textDark, height: "100%" },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },
});
