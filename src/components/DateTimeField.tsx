import React, { createElement, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/theme";

interface Props {
  mode: "date" | "time";
  value: Date | null;
  onChange: (d: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
}

const two = (n: number) => String(n).padStart(2, "0");

function label(mode: "date" | "time", v: Date) {
  return mode === "date"
    ? v.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : v.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Works on web (browser date/time picker) and on Android / iOS (native picker).
export default function DateTimeField({ mode, value, onChange, placeholder, minimumDate }: Props) {
  const [show, setShow] = useState(false);
  const icon = mode === "date" ? "calendar-outline" : "time-outline";
  const text = value ? label(mode, value) : placeholder ?? (mode === "date" ? "Select date" : "Select time");

  const box = (
    <View style={styles.box}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={[value ? styles.value : styles.placeholder, { marginLeft: spacing.sm }]}>{text}</Text>
    </View>
  );

  // ---------- Web: transparent <input type="date|time"> laid over the box ----------
  if (Platform.OS === "web") {
    const today = new Date();
    const min = `${today.getFullYear()}-${two(today.getMonth() + 1)}-${two(today.getDate())}`;
    const current = value
      ? mode === "date"
        ? `${value.getFullYear()}-${two(value.getMonth() + 1)}-${two(value.getDate())}`
        : `${two(value.getHours())}:${two(value.getMinutes())}`
      : "";
    return (
      <View style={{ position: "relative" }}>
        {box}
        {createElement("input", {
          type: mode,
          value: current,
          min: mode === "date" ? min : undefined,
          onClick: (e: any) => e.currentTarget.showPicker?.(),
          onChange: (e: any) => {
            const v: string = e.target.value;
            if (!v) return;
            if (mode === "date") {
              const [y, m, d] = v.split("-").map(Number);
              onChange(new Date(y, m - 1, d));
            } else {
              const [h, mi] = v.split(":").map(Number);
              const d = new Date();
              d.setHours(h, mi, 0, 0);
              onChange(d);
            }
          },
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 50,
            opacity: 0,
            cursor: "pointer",
            border: "none",
          },
        })}
      </View>
    );
  }

  // ---------- Android / iOS ----------
  return (
    <View>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setShow((s) => !s)}>
        {box}
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          display={Platform.OS === "ios" ? (mode === "date" ? "inline" : "spinner") : "default"}
          minimumDate={mode === "date" ? minimumDate ?? new Date() : undefined}
          onChange={(event: any, selected?: Date) => {
            if (Platform.OS === "android") setShow(false);
            if (event.type === "dismissed") return;
            if (selected) onChange(selected);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
    marginBottom: spacing.lg,
  },
  value: { fontSize: 14, color: colors.textDark, fontWeight: "600" },
  placeholder: { fontSize: 14, color: colors.textMuted },
});
