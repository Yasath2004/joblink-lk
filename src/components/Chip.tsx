import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  bg?: string;
  style?: ViewStyle;
  small?: boolean;
}

export default function Chip({ label, selected, onPress, color, bg, style, small }: Props) {
  const chipStyle = [
    styles.base,
    small && styles.small,
    {
      backgroundColor: selected ? colors.primary : bg || colors.surfaceMint,
      borderColor: selected ? colors.primary : colors.border,
    },
    style,
  ];
  const textStyle = [
    styles.text,
    small && { fontSize: 11 },
    { color: selected ? "#fff" : color || colors.primaryDark },
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={chipStyle}>
        <Text style={textStyle}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={chipStyle}>
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  small: { paddingHorizontal: spacing.sm, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: "600" },
});
