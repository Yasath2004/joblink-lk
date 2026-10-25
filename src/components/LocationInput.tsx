import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/theme";
import { Place, searchPlacesLK } from "../data/geoApi";
import Input from "./Input";

interface Props {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  // Called with the chosen place, or null when the user edits the text by hand afterwards.
  onPlace?: (p: Place | null) => void;
}

// Text field that suggests places in Sri Lanka (from OpenStreetMap) while you type.
export default function LocationInput({ label = "Location", placeholder, value, onChangeText, onPlace }: Props) {
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const skipNext = useRef(false); // don't search again right after picking a suggestion
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ctrl = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    clearTimeout(timer.current);
    ctrl.current?.abort();
    if (value.trim().length < 3) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const c = new AbortController();
      ctrl.current = c;
      try {
        setResults(await searchPlacesLK(value, c.signal));
        setSearched(true);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setResults([]);
          setSearched(false);
        }
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer.current);
  }, [value]);

  const pick = (p: Place) => {
    skipNext.current = true;
    onChangeText(p.label);
    onPlace?.(p);
    setResults([]);
    setSearched(false);
  };

  return (
    <View>
      <Input
        label={label}
        icon="location-outline"
        placeholder={placeholder}
        value={value}
        onChangeText={(v) => {
          onChangeText(v);
          onPlace?.(null);
        }}
      />
      {(loading || results.length > 0 || searched) && (
        <View style={styles.box}>
          {loading && results.length === 0 && (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.text, { marginLeft: spacing.sm }]}>Searching...</Text>
            </View>
          )}
          {results.map((p, i) => (
            <TouchableOpacity key={p.label + i} style={[styles.row, i > 0 && styles.divider]} onPress={() => pick(p)}>
              <Ionicons name="location" size={16} color={colors.primaryDark} />
              <Text style={[styles.text, { marginLeft: spacing.sm, flex: 1 }]} numberOfLines={1}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
          {!loading && searched && results.length === 0 && (
            <View style={styles.row}>
              <Text style={[styles.text, { color: colors.textMuted }]}>No places found in Sri Lanka</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: "#fff",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  text: { fontSize: 13, color: colors.textDark },
});
