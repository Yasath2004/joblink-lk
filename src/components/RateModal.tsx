import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/theme";
import Button from "./Button";

export default function RateModal({
  visible,
  title,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(rating, comment);
      setComment("");
      setRating(5);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Ionicons name={n <= rating ? "star" : "star-outline"} size={34} color={colors.star} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write a short review (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
          />
          <Button label="Submit" loading={busy} onPress={submit} />
          <TouchableOpacity onPress={onClose} style={{ alignItems: "center", marginTop: spacing.md }}>
            <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.xl },
  sheet: { backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.xl },
  title: { fontSize: 17, fontWeight: "800", color: colors.textDark, textAlign: "center" },
  stars: { flexDirection: "row", justifyContent: "center", marginVertical: spacing.lg },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
    color: colors.textDark,
  },
});
