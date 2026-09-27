export const palette = {
  navy900: "#0F172A",
  navy800: "#1E293B",
  navy700: "#334155",
  navy600: "#475569",
  navy500: "#64748B",
  navy400: "#94A3B8",
  navy300: "#CBD5E1",
  navy200: "#E2E8F0",
  navy100: "#F1F5F9",
  navy50: "#F8FAFC",
  white: "#FFFFFF",

  green500: "#22C55E",
  green600: "#16A34A",
  green700: "#15803D",
  green900: "#14532D",
  green950: "#052E16",

  red500: "#EF4444",
  red400: "#F87171",
  red600: "#DC2626",
  red900: "#7F1D1D",

  amber500: "#F59E0B",
  amber400: "#FBBF24",
  amber900: "#78350F",

  blue500: "#3B82F6",
  blue600: "#2563EB",
  blue900: "#1E3A8A",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentPressed: string;
  accentSoft: string;
  accentBorder: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  warningSoft: string;
  overlay: string;
  tabBar: string;
  skeleton: string;
};

export const darkColors: ThemeColors = {
  background: palette.navy900,
  surface: palette.navy800,
  surfaceRaised: palette.navy700,
  surfaceSunken: "#0B1220",
  border: palette.navy700,
  borderStrong: palette.navy600,
  text: palette.navy50,
  textMuted: palette.navy300,
  textSubtle: palette.navy500,
  accent: palette.green500,
  accentPressed: palette.green700,
  accentSoft: palette.green900,
  accentBorder: palette.green500,
  danger: palette.red400,
  dangerSoft: "rgba(239,68,68,0.12)",
  success: palette.green500,
  warning: palette.amber400,
  warningSoft: "rgba(245,158,11,0.12)",
  overlay: "rgba(0,0,0,0.6)",
  tabBar: "rgba(255,255,255,0.07)",
  skeleton: palette.navy800,
};

export const lightColors: ThemeColors = {
  background: "#F1F5F9",
  surface: palette.white,
  surfaceRaised: palette.navy50,
  surfaceSunken: "#E2E8F0",
  border: palette.navy200,
  borderStrong: palette.navy300,
  text: palette.navy900,
  textMuted: palette.navy600,
  textSubtle: palette.navy500,
  accent: palette.green600,
  accentPressed: palette.green700,
  accentSoft: palette.green950,
  accentBorder: palette.green600,
  danger: palette.red600,
  dangerSoft: "rgba(220,38,38,0.10)",
  success: palette.green600,
  warning: palette.amber500,
  warningSoft: "rgba(245,158,11,0.14)",
  overlay: "rgba(15,23,42,0.45)",
  tabBar: "rgba(15,23,42,0.05)",
  skeleton: "#E2E8F0",
};

export type Theme = {
  dark: boolean;
  colors: ThemeColors;
  radii: typeof radii;
  spacing: typeof spacing;
};
