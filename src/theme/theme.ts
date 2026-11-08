import { MD3LightTheme } from "react-native-paper";
import { DefaultTheme as NavigationDefaultTheme } from "@react-navigation/native";

export const colors = {
  // Brand Blues
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  primaryDark: "#1E3A8A",
  primaryLight: "#EFF6FF",
  primaryBorder: "#BFDBFE",
  primaryAccent: "#3B82F6",

  // Corporate Deep Navy (The Serviceverse circuit identity)
  navy: "#00051B",
  navyCard: "#070E28",
  navyBorder: "#1E293B",

  // Typography & Text
  textPrimary: "#0F172A", // Deep Obsidian Slate - maximum contrast, never muddy
  textSecondary: "#334155", // Slate 700 - high contrast readability
  textMuted: "#64748B", // Slate 500 - secondary labels & captions
  textPlaceholder: "#94A3B8", // Slate 400 - clean input placeholders
  textInverse: "#FFFFFF",

  // Background Surfaces
  bgCanvas: "#F8FAFC", // Crisp, clean canvas (Slate 50)
  bgCard: "#FFFFFF", // Elevated pure white cards
  bgCardSubtle: "#F1F5F9", // Nested secondary panels
  bgInput: "#FFFFFF", // Crisp white input fields

  // Borders & Dividers
  border: "#E2E8F0",
  borderInput: "#CBD5E1",
  borderFocus: "#2563EB",

  // Status & Feedback
  success: "#10B981",
  successBg: "#DCFCE7",
  successBorder: "#86EFAC",
  successText: "#15803D",

  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  warningBorder: "#FDE68A",
  warningText: "#B45309",

  danger: "#EF4444",
  dangerBg: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  dangerText: "#DC2626",

  star: "#F59E0B",
};

/**
 * React Native Paper MD3 Theme configured with high-contrast,
 * ultra-clean corporate styling. Eliminates default muddy purples and
 * prevents text disappearance when Android dark mode is active.
 */
export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: colors.primaryLight,
    onPrimaryContainer: colors.primaryDark,

    secondary: colors.textPrimary,
    onSecondary: "#FFFFFF",
    secondaryContainer: colors.primaryLight,
    onSecondaryContainer: colors.primaryDark,

    tertiary: colors.warning,
    onTertiary: "#FFFFFF",
    tertiaryContainer: colors.warningBg,
    onTertiaryContainer: colors.warningText,

    surface: colors.bgCard,
    onSurface: colors.textPrimary,
    surfaceVariant: colors.bgCanvas,
    onSurfaceVariant: colors.textSecondary,

    background: colors.bgCanvas,
    onBackground: colors.textPrimary,

    outline: colors.borderInput,
    outlineVariant: colors.border,

    error: colors.danger,
    onError: "#FFFFFF",
    errorContainer: colors.dangerBg,
    onErrorContainer: colors.dangerText,

    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: "transparent",
      level1: colors.bgCard,
      level2: colors.bgCard,
      level3: colors.bgCard,
      level4: colors.bgCard,
      level5: colors.bgCard,
    },
  },
};

/**
 * React Navigation Theme aligned with our crisp canvas background.
 */
export const navigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: colors.primary,
    background: colors.bgCanvas,
    card: colors.bgCard,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
};

