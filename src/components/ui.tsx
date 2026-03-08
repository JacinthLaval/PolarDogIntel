import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../utils/theme';

// ─── StatusDot ─────────────────────────────────────────────────────────────────

type StatusColor = 'connected' | 'connecting' | 'disconnected' | 'error';

const STATUS_COLORS: Record<StatusColor, string> = {
  connected: Colors.success,
  connecting: Colors.warning,
  disconnected: Colors.text2,
  error: Colors.error,
};

export function StatusDot({ status }: { status: StatusColor }) {
  const color = STATUS_COLORS[status];
  return (
    <View style={[styles.statusDot, { backgroundColor: color }]}>
      {status === 'connecting' && (
        <View style={[styles.statusPulse, { borderColor: color }]} />
      )}
    </View>
  );
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.btnBase,
    variant === 'primary' && styles.btnPrimary,
    variant === 'secondary' && styles.btnSecondary,
    variant === 'ghost' && styles.btnGhost,
    variant === 'danger' && styles.btnDanger,
    isDisabled && styles.btnDisabled,
    style ?? {},
  ];

  const textStyle: TextStyle[] = [
    styles.btnText,
    variant === 'ghost' && { color: Colors.accent },
    variant === 'danger' && { color: Colors.error },
    isDisabled && { color: Colors.text2 },
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={containerStyle}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.bg0 : Colors.accent}
        />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: boolean;
}

export function Card({ children, style, accent }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        accent && styles.cardAccent,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionDash} />
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      {icon && <Text style={styles.emptyIcon}>{icon}</Text>}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

export function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // StatusDot
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    top: -3,
    left: -3,
    opacity: 0.5,
  },

  // Button
  btnBase: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnPrimary: {
    backgroundColor: Colors.accent,
    ...Shadows.glow,
  },
  btnSecondary: {
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.bg3,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  btnDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  btnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.bg0,
    letterSpacing: 0.3,
  },

  // Card
  card: {
    backgroundColor: Colors.bg1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.bg3,
    padding: Spacing.md,
    ...Shadows.card,
  },
  cardAccent: {
    borderColor: Colors.accentDim,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  sectionDash: {
    width: 16,
    height: 1,
    backgroundColor: Colors.accent,
  },
  sectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text1,
    letterSpacing: 1.5,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.bg3,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text1,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text2,
    textAlign: 'center',
    maxWidth: 260,
  },

  // Chip
  chip: {
    backgroundColor: Colors.accentGlow,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.accentDim,
  },
  chipText: {
    fontSize: Typography.size.xs,
    color: Colors.accent,
    fontWeight: Typography.weight.medium,
    letterSpacing: 0.5,
  },
});
