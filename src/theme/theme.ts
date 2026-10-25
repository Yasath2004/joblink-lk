// JobLink LK — design tokens
// Colors sampled from the JobLink LK Figma design (deep teal + mint + amber accents)

export const colors = {
  // Core teal brand
  bgDark: "#0B3B37", // deep teal background (splash / auth / onboarding)
  bgDarker: "#082B28",
  primary: "#14B8A6", // bright teal (buttons, active states)
  primaryDark: "#0E9488",
  primaryLight: "#5EEAD4",

  // Surfaces
  surface: "#FFFFFF",
  surfaceMint: "#EAFBF8", // pale mint card backgrounds
  surfaceMuted: "#F4F8F7",
  border: "#E1EEEC",

  // Text
  textDark: "#0F2A27",
  textBody: "#476462",
  textMuted: "#8AA5A2",
  textOnDark: "#FFFFFF",
  textOnDarkMuted: "#B7D4D0",

  // Status / accents
  urgent: "#EF4444",
  urgentBg: "#FEECEC",
  warning: "#F59E0B",
  amber: "#F97316", // employer CTA accent
  amberBg: "#FFF1E4",
  success: "#22C55E",
  successBg: "#E9FBEF",
  info: "#3B82F6",
  star: "#F5B301",

  // Category tag colors
  tagGardening: "#22C55E",
  tagCleaning: "#3B82F6",
  tagPainting: "#A855F7",
  tagDriving: "#F97316",
  tagTutoring: "#EC4899",
  tagMoving: "#F59E0B",

  white: "#FFFFFF",
  black: "#000000",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const font = {
  h1: { fontSize: 26, fontWeight: "800" as const, color: colors.textDark },
  h2: { fontSize: 20, fontWeight: "700" as const, color: colors.textDark },
  h3: { fontSize: 16, fontWeight: "700" as const, color: colors.textDark },
  body: { fontSize: 14, fontWeight: "400" as const, color: colors.textBody },
  small: { fontSize: 12, fontWeight: "400" as const, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: "600" as const, color: colors.textDark },
};

export const shadow = {
  card: {
    shadowColor: "#0B3B37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
};
