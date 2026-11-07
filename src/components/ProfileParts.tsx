import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing } from "../theme/theme";
import { colorFor } from "../data/util";
import Avatar from "./Avatar";

// Label + colour for a verification status
export function verifyHint(status?: string): { text: string; color: string } {
  switch (status) {
    case "verified":
      return { text: "Verified", color: colors.success };
    case "pending":
      return { text: "Under review", color: colors.amber };
    case "rejected":
      return { text: "Declined", color: colors.urgent };
    default:
      return { text: "Not verified", color: colors.textMuted };
  }
}

// ---------- Profile hero card ----------
export function ProfileHero({
  name,
  avatarUrl,
  location,
  rating,
  reviews,
  onEdit,
  verified,
}: {
  name: string;
  avatarUrl?: string;
  location?: string;
  rating: number;
  reviews: number;
  onEdit?: () => void;
  verified?: boolean;
}) {
  return (
    <View style={[styles.hero, shadow.card]}>
      <View>
        <Avatar name={name} color={colorFor(name)} uri={avatarUrl} size={88} />
        {onEdit && (
          <TouchableOpacity style={styles.editBadge} onPress={onEdit}>
            <Ionicons name="camera" size={13} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.md }}>
        <Text style={[styles.heroName, { marginTop: 0, flexShrink: 1 }]} numberOfLines={1}>
          {name}
        </Text>
        {verified && <Ionicons name="shield-checkmark" size={20} color="#2563EB" style={{ marginLeft: 6 }} />}
      </View>
      {verified && <Text style={styles.verifiedText}>Verified account</Text>}
      {!!location && (
        <View style={styles.heroRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.heroMeta}> {location}</Text>
        </View>
      )}
      <View style={styles.ratingPill}>
        <Ionicons name="star" size={13} color={colors.star} />
        <Text style={styles.ratingText}>
          {reviews > 0 ? ` ${rating.toFixed(1)} · ${reviews} ${reviews === 1 ? "review" : "reviews"}` : " New member"}
        </Text>
      </View>
    </View>
  );
}

// ---------- Stats strip (3 equal cells in one card) ----------
export function StatsStrip({ items }: { items: { value: string; label: string; star?: boolean }[] }) {
  return (
    <View style={[styles.stats, shadow.card]}>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.statCell, i > 0 && styles.statDivider]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.statValue}>{it.value}</Text>
            {it.star && <Ionicons name="star" size={14} color={colors.star} style={{ marginLeft: 3 }} />}
          </View>
          <Text style={styles.statLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------- Section with optional action on the same line ----------
export function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!action && (
          <TouchableOpacity onPress={onAction} hitSlop={8}>
            <Text style={styles.sectionAction}>{action}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

// ---------- Account menu ----------
export function MenuCard({ children }: { children: React.ReactNode }) {
  return <View style={[styles.menu, shadow.card]}>{children}</View>;
}

export function MenuRow({
  icon,
  label,
  onPress,
  danger,
  last,
  hint,
  hintColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
  hint?: string;
  hintColor?: string;
}) {
  const color = danger ? colors.urgent : colors.textDark;
  return (
    <TouchableOpacity style={[styles.menuRow, !last && styles.menuDivider]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? colors.urgentBg : colors.surfaceMint }]}>
        <Ionicons name={icon} size={17} color={danger ? colors.urgent : colors.primaryDark} />
      </View>
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      {!!hint && <Text style={[styles.menuHint, hintColor ? { color: hintColor } : null]}>{hint}</Text>}
      {!danger && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  editBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: { fontSize: 20, fontWeight: "800", color: colors.textDark, marginTop: spacing.md },
  verifiedText: { fontSize: 11, fontWeight: "700", color: "#2563EB", marginTop: 2 },
  heroRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  heroMeta: { fontSize: 13, color: colors.textMuted },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMint,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  ratingText: { fontSize: 12, fontWeight: "700", color: colors.primaryDark },

  stats: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  statCell: { flex: 1, alignItems: "center", justifyContent: "center" },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.textDark },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3, fontWeight: "600" },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.textDark },
  sectionAction: { fontSize: 13, fontWeight: "700", color: colors.primaryDark },

  menu: { backgroundColor: "#fff", borderRadius: radius.lg, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuHint: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginRight: 6 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600", marginLeft: spacing.md },
});
