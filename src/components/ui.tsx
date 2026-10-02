import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useNavigation } from "expo-router";
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
  type ViewStyle,
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

/** Vertical rhythm container. Prefer this over hand-rolled marginBottom chains. */
export function Stack({
  children,
  gap = 16,
  style,
  ...rest
}: {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
} & Omit<ViewProps, "style">) {
  return (
    <View style={[{ gap }, style]} {...rest}>
      {children}
    </View>
  );
}

/** A titled block: section header plus its content, with consistent spacing. */
export function Section({
  title,
  action,
  onAction,
  children,
  gap = 12,
  style,
}: {
  title?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap }, style]}>
      {title ? (
        <SectionHeader
          title={title}
          action={action}
          onAction={onAction}
          style={NO_MARGIN}
        />
      ) : null}
      {children}
    </View>
  );
}

type IconBadgeProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  tone?: "neutral" | "accent" | "danger" | "warning" | "success";
  style?: ViewStyle;
};

export function IconBadge({
  icon,
  size = 42,
  tone = "accent",
  style,
}: IconBadgeProps) {
  const { colors } = useTheme();

  const palette = {
    neutral: { bg: colors.surfaceRaised, fg: colors.textMuted },
    accent: { bg: colors.accentSoft, fg: colors.accent },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    success: { bg: colors.accentSoft, fg: colors.accent },
  }[tone];

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.bg,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.46} color={palette.fg} />
    </View>
  );
}

/** Equal-width pill tabs, for switching between views of the same data. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const { colors, radii } = useTheme();

  return (
    <View style={styles.tabsRow}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${option.label} view`}
            style={({ pressed }) => [
              styles.tab,
              {
                borderRadius: radii.pill,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active
                  ? colors.accentSoft
                  : pressed
                    ? colors.surfaceRaised
                    : "transparent",
              },
            ]}
          >
            <Text
              style={{
                color: active ? colors.accent : colors.textMuted,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A tappable card row. Replaces the hand-rolled bordered Pressable blocks. */
export function Tile({
  children,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}) {
  const { colors, radii } = useTheme();

  if (!onPress) {
    return (
      <View
        style={[
          {
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 16,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** A card that groups rows separated by dividers. */
export function ListCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <Card style={[{ paddingVertical: 6 }, style]}>{children}</Card>;
}

/** Label on the left, value on the right. */
export function DetailRow({
  label,
  value,
  valueColor,
  selectable = false,
  wide = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  selectable?: boolean;
  /** Renders the value monospaced-ish, for account numbers and references. */
  wide?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={{ color: colors.textSubtle, fontSize: 13 }}>{label}</Text>
      <Text
        selectable={selectable}
        style={{
          color: valueColor ?? colors.text,
          fontSize: 15,
          fontWeight: "600",
          flexShrink: 1,
          textAlign: "right",
          letterSpacing: wide ? 1 : undefined,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

type SegmentOption<T extends string> = { key: T; label: string };

/** Wrapping pill filter used by list screens. */
export function SegmentedFilter<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const { colors, radii } = useTheme();

  return (
    <View style={styles.filterRow}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter ${option.label}`}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: active ? colors.accent : colors.border,
              backgroundColor: active
                ? colors.accentSoft
                : pressed
                  ? colors.surfaceRaised
                  : "transparent",
            })}
          >
            <Text
              style={{
                color: active ? colors.accent : colors.textMuted,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ButtonProps = PressableProps & {
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "dangerOutline";
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
    dangerOutline: "transparent",
  }[variant];

  const foreground = {
    primary: "#052E16",
    secondary: colors.text,
    ghost: colors.accent,
    danger: "#FFFFFF",
    dangerOutline: colors.danger,
  }[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      style={(state) => [
        {
          minHeight: size === "lg" ? 58 : 52,
          borderRadius: radii.md,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: background,
          borderWidth: variant === "ghost" || variant === "dangerOutline" ? 1 : 0,
          borderColor: variant === "dangerOutline" ? colors.danger : colors.border,
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
            style={{ color: colors.textSubtle, fontSize: 13, marginTop: 3 }}
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

const ROW_PADDING = 4;
const ROW_GAP = 14;

/**
 * Divider inset that lines a divider up with the title text of a sibling `Row`.
 *
 * Rows are measured from the row's own content box, so this is independent of
 * the padding on the surrounding `Card`/`ListCard`. Pass the width of the row's
 * left slot: 20 for a bare `icon`, or the badge size when passing `left`.
 */
export function rowTextInset(leftWidth = 20): number {
  return ROW_PADDING + leftWidth + ROW_GAP;
}

export function Divider({
  inset = 0,
  style,
}: {
  inset?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          height: 1,
          marginLeft: inset,
          backgroundColor: colors.border,
        },
        style,
      ]}
    />
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
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
  gap,
  ...rest
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewProps["style"];
  /** Vertical rhythm applied between direct children. */
  gap?: number;
} & ScrollViewProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const padding = {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 40 + insets.bottom,
  };

  const rhythm = gap ? { gap } : null;

  if (!scroll) {
    return (
      <View
        style={[
          { flex: 1, backgroundColor: colors.background },
          padding,
          rhythm,
          contentStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[padding, rhythm, contentStyle]}
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
  const navigation = useNavigation();
  const canGoBack = navigation?.canGoBack?.() ?? false;

  const handleBack = () => {
    if (canGoBack && onBack) {
      onBack();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={styles.headerBar}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable
            onPress={handleBack}
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
        {right ?? <View style={{ width: 40 }} />}
      </View>
    </View>
  );
}

/**
 * Compact action for the `HeaderBar` right slot.
 *
 * That slot is a fixed 60pt box so the centred title stays aligned, which makes
 * a full `Button` overflow. Use this instead of a button in headers.
 */
export function HeaderAction({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.headerAction,
        {
          borderRadius: 999,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceRaised : "transparent",
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={colors.accent} />
      ) : null}
      <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
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
  tone: "success" | "danger" | "warning" | "info";
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const { colors, radii } = useTheme();
  const map: Record<
    string,
    { bg: string; fg: string; fallback: React.ComponentProps<typeof Ionicons>["name"] }
  > = {
    info: { bg: colors.surfaceRaised, fg: colors.textMuted, fallback: "information-circle" },
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

const NO_MARGIN = { marginBottom: 0 } as const;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 64,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  rowLeft: {},
  rowBody: { flex: 1, gap: 0 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    // Safe-area clearance comes from `Screen`'s paddingTop, so this only adds a
    // little breathing room. A large value here doubles up with Screen.
    paddingTop: 4,
    paddingBottom: 18,
    gap: 8,
  },
  headerSide: { width: 84, justifyContent: "center" },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 11,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderWidth: 1,
  },
});
