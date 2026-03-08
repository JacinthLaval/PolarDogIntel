import { StyleSheet } from 'react-native';

// ─── PolarDog Intel Design System ─────────────────────────────────────────────
// Aesthetic: Arctic command center — deep navy base, ice-blue accents,
// crisp mono type, subtle aurora gradients. Think Svalbard research station.

export const Colors = {
  // Base
  bg0: '#080C18',   // deepest background
  bg1: '#0D1224',   // card bg
  bg2: '#131929',   // elevated surface
  bg3: '#1C2540',   // border / divider

  // Accent — ice blue
  accent: '#4DD9F5',
  accentDim: '#1A8BA8',
  accentGlow: 'rgba(77, 217, 245, 0.15)',

  // Aurora
  aurora1: '#4DD9F5',  // ice
  aurora2: '#6B5ECD',  // deep violet
  aurora3: '#2ECC8C',  // green

  // Text
  text0: '#EAF4F8',   // primary
  text1: '#8BAABB',   // secondary
  text2: '#4A6275',   // muted

  // Status
  success: '#2ECC8C',
  warning: '#F5C842',
  error: '#F55A4D',

  // Transparent
  overlay: 'rgba(8, 12, 24, 0.85)',
} as const;

export const Typography = {
  // Display — used for headings
  displayFamily: 'SpaceMono',   // loaded via expo-font or system mono fallback
  bodyFamily: 'System',

  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 36,
  },

  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 6,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const Shadows = {
  glow: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// ─── Common reusable styles ────────────────────────────────────────────────────
export const baseStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg0,
  },
  card: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.bg3,
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textPrimary: {
    color: Colors.text0,
    fontSize: Typography.size.md,
  },
  textSecondary: {
    color: Colors.text1,
    fontSize: Typography.size.sm,
  },
  textMuted: {
    color: Colors.text2,
    fontSize: Typography.size.xs,
  },
  textAccent: {
    color: Colors.accent,
    fontSize: Typography.size.md,
  },
});
