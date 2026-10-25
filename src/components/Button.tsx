import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/theme";

interface Props extends TouchableOpacityProps {
  label: string;
  variant?: "primary" | "secondary" | "outline" | "amber";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  label,
  variant = "primary",
  icon,
  loading,
  fullWidth = true,
  style,
  disabled,
  ...rest
}: Props) {
  const isPrimary = variant === "primary";
  const isAmber = variant === "amber";
  const isOutline = variant === "outline";
  const isSecondary = variant === "secondary";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.base,
        fullWidth && { alignSelf: "stretch" },
        isPrimary && { backgroundColor: colors.primary },
        isAmber && { backgroundColor: colors.amber },
        isSecondary && { backgroundColor: colors.surfaceMint },
        isOutline && {
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: colors.border,
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isOutline || isSecondary ? colors.primary : "#fff"} />
      ) : (
        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              (isPrimary || isAmber) && { color: "#fff" },
              isSecondary && { color: colors.primaryDark },
              isOutline && { color: colors.textDark },
            ]}
          >
            {label}
          </Text>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={isPrimary || isAmber ? "#fff" : colors.primaryDark}
              style={{ marginLeft: spacing.xs }}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center" },
  label: { fontSize: 15, fontWeight: "700" },
});
