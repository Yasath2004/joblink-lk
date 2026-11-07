import React from "react";
import { Ionicons } from "@expo/vector-icons";

// Small blue shield shown next to the name of a verified worker / employer
export default function VerifiedBadge({ size = 15 }: { size?: number }) {
  return <Ionicons name="shield-checkmark" size={size} color="#2563EB" style={{ marginLeft: 4 }} />;
}
