import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

export default function Avatar({
  name,
  size = 44,
  color = "#14B8A6",
  online,
  uri,
}: {
  name: string;
  size?: number;
  color?: string;
  online?: boolean;
  uri?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color + "30" },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.text, { color, fontSize: size * 0.38 }]}>{initials}</Text>
        )}
      </View>
      {online && (
        <View
          style={[
            styles.dot,
            { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14 },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "800" },
  dot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
