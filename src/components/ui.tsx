import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/ThemeProvider";

export function Card({ style, ...rest }: ViewProps) {
  const { colors, radii } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
      {...rest}
    />
  );
}

type ButtonProps = PressableProps & {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  size?: "md" | "lg";
  icon?: React.ComponentProps<typeof Ionicons>["name"];
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  size = "md",
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, radii } = useTheme();

  const background = {
    primary: colors.accent,
    secondary: colors.surfaceRaised,
    ghost: "transparent",
    danger: colors.danger,
  }[variant];

  const foreground = {
    primary: "#052E16",
    secondary: colors.text,
    ghost: colors.accent,
    danger: "#FFFFFF",
  }[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      style={(state) => [
        {
          minHeight: size === "lg" ? 54 : 46,
          borderRadius: radii.md,
          paddingHorizontal: radii.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: background,
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : state.pressed ? 0.85 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}
          <Text style={{ color: foreground, fontSize: 15, fontWeight: "700" }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

type RowProps = {
  title: string;
  subtitle?: string | null;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  iconColor?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function Row({
  title,
  subtitle,
  icon,
  iconColor,
  left,
  right,
  chevron = false,
  onPress,
  danger = false,
  disabled = false,
}: RowProps) {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        styles.row,
        disabled && { opacity: 0.45 },
      ]}
    >
      {left ? (
        <View style={styles.rowLeft}>{left}</View>
      ) : icon ? (
        <View style={styles.rowLeft}>
          <Ionicons
            name={icon}
            size={20}
            color={iconColor ?? (danger ? colors.danger : colors.textMuted)}
          />
        </View>
      ) : null}
      <View style={styles.rowBody}>
        <Text
          numberOfLines={1}
          style={{ color: danger ? colors.danger : colors.text, fontSize: 15, fontWeight: "600" }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{ color: colors.textSubtle, fontSize: 13, marginTop: 2 }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? (
        <Ionicons name="chevron-forward" size={17} color={colors.textSubtle} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        { borderRadius: 16 },
        pressed ? { backgroundColor: colors.surfaceRaised } : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: 1,
        marginLeft: inset,
        backgroundColor: colors.border,
      }}
    />
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Skeleton({ height = 16, width = "100%" }: { height?: number; width?: number | `${number}%` }) {
  const { colors, radii } = useTheme();
  return (
    <View
      style={{
        height,
        width,
        borderRadius: radii.sm,
        backgroundColor: colors.skeleton,
        opacity: 0.7,
      }}
    />
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  message,
  action,
  onAction,
}: {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.centered}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}
      >
        <Ionicons name={icon} size={26} color={colors.textSubtle} />
      </View>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            color: colors.textSubtle,
            fontSize: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {message}
        </Text>
      ) : null}
      {action && onAction ? (
        <Button label={action} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.centered}>
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={26} color={colors.danger} />
      </View>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
        Something went wrong
      </Text>
      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 14,
          textAlign: "center",
        }}
      >
        {message}
      </Text>
      {onRetry ? (
        <Button label="Try again" onPress={onRetry} variant="secondary" />
      ) : null}
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  ...rest
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewProps["style"];
} & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const padding = {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24 + insets.bottom,
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background }, contentStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[padding, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.textSubtle}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

export function HeaderBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.headerBar}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.iconButton, { backgroundColor: colors.surfaceRaised }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        ) : (
          <View style={{ width: 4 }} />
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{ color: colors.text, fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" }}
      >
        {title}
      </Text>
      <View style={[styles.headerSide, { alignItems: "flex-end" }]}>
        {right ?? <View style={{ width: 36 }} />}
      </View>
    </View>
  );
}

export function Chip({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const { colors, radii } = useTheme();
  const map: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceRaised, fg: colors.textMuted },
    success: { bg: colors.accentSoft, fg: colors.accent },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    accent: { bg: colors.accentSoft, fg: colors.accent },
  };
  const tone2 = map[tone];
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: tone2.bg, borderRadius: radii.pill },
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={tone2.fg} /> : null}
      <Text style={{ color: tone2.fg, fontSize: 11, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

export function Banner({
  tone,
  message,
  icon,
}: {
  tone: "success" | "danger" | "warning";
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const { colors, radii } = useTheme();
  const map: Record<
    string,
    { bg: string; fg: string; fallback: React.ComponentProps<typeof Ionicons>["name"] }
  > = {
    success: { bg: colors.accentSoft, fg: colors.accent, fallback: "checkmark-circle" },
    danger: { bg: colors.dangerSoft, fg: colors.danger, fallback: "alert-circle" },
    warning: { bg: colors.warningSoft, fg: colors.warning, fallback: "warning" },
  };
  const t = map[tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        { backgroundColor: t.bg, borderRadius: radii.md },
      ]}
    >
      <Ionicons name={icon ?? t.fallback} size={16} color={t.fg} />
      <Text style={{ color: t.fg, fontSize: 13, fontWeight: "600", flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowLeft: {},
  rowBody: { flex: 1, gap: 0 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    gap: 8,
  },
  headerSide: { width: 60, justifyContent: "center" },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
});
