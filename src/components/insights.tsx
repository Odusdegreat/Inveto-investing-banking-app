import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Card, Divider, Row, rowTextInset } from "@/src/components/ui";
import { useTheme } from "@/src/theme/ThemeProvider";

/**
 * Building blocks the analytics and settings screens need on top of `ui.tsx`:
 * progress meters, small charts, toggles and a text field. Same theme tokens,
 * same prop conventions, so they sit next to the existing primitives.
 */

/** Horizontal fill meter. `tone` picks the fill colour, `tone="danger"` when over. */
export function ProgressBar({
  value,
  tone = "accent",
  height = 8,
}: {
  /** 0 to 1. Values above 1 render full. */
  value: number;
  tone?: "accent" | "warning" | "danger" | "muted";
  height?: number;
}) {
  const { colors, radii } = useTheme();
  const fill = {
    accent: colors.accent,
    warning: colors.warning,
    danger: colors.danger,
    muted: colors.textSubtle,
  }[tone];

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(value, 1) * 100) }}
      style={{
        height,
        borderRadius: radii.pill,
        backgroundColor: colors.surfaceRaised,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${Math.min(Math.max(value, 0), 1) * 100}%`,
          height: "100%",
          borderRadius: radii.pill,
          backgroundColor: fill,
        }}
      />
    </View>
  );
}

/** A labelled meter with the numbers on the right, used by budgets and goals. */
export function Meter({
  label,
  detail,
  ratio,
  tone,
}: {
  label: string;
  detail: string;
  ratio: number;
  tone?: "accent" | "warning" | "danger" | "muted";
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.between}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>{detail}</Text>
      </View>
      <ProgressBar value={ratio} tone={tone} />
    </View>
  );
}

type BarTone = "accent" | "blue" | "amber" | "muted";

/** Vertical bar chart. `values` are drawn relative to the tallest bar. */
export function BarChart({
  values,
  labels,
  height = 120,
  tone = "accent",
}: {
  values: number[];
  labels?: string[];
  height?: number;
  tone?: BarTone | BarTone[];
}) {
  const { colors } = useTheme();
  const max = Math.max(...values, 1);
  const palette = [colors.accent, "#3B82F6", colors.warning, colors.textSubtle];

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.bars, { height }]}>
        {values.map((value, index) => {
          const key = Array.isArray(tone) ? tone[index % tone.length] : tone;
          const color = {
            accent: colors.accent,
            blue: palette[1],
            amber: palette[2],
            muted: palette[3],
          }[key];
          return (
            <View key={index} style={styles.barSlot}>
              <View
                style={{
                  width: "100%",
                  height: `${Math.max((value / max) * 100, 2)}%`,
                  borderRadius: 6,
                  backgroundColor: color,
                }}
              />
            </View>
          );
        })}
      </View>
      {labels ? (
        <View style={styles.bars}>
          {labels.map((label, index) => (
            <Text
              key={`${label}-${index}`}
              style={{ color: colors.textSubtle, fontSize: 11, textAlign: "center", flex: 1 }}
            >
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Segmented ring. Slices are normalised, so they need not sum to anything fixed. */
export function Donut({
  slices,
  size = 148,
  thickness = 18,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const { colors } = useTheme();
  const total = slices.reduce((sum, slice) => sum + Math.max(slice.value, 0), 0);
  const stroke = thickness;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Each arc is drawn full-circle and trimmed, then rotated to its start angle.
  // Offsets are derived up front so render stays pure.
  const offsets = slices.reduce<number[]>((acc, slice) => {
    const previous = acc.length ? acc[acc.length - 1] : 0;
    return [...acc, previous + Math.max(slice.value, 0)];
  }, []);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceRaised}
          strokeWidth={stroke}
          fill="none"
        />
        {slices.map((slice, index) => {
          const fraction = total === 0 ? 0 : Math.max(slice.value, 0) / total;
          if (fraction === 0) return null;
          const start = offsets[index] / total;
          return (
            <Circle
              key={slice.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={slice.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              fill="none"
              strokeDasharray={`${fraction * circumference} ${circumference}`}
              // -90 puts the first slice's start at 12 o'clock.
              transform={`rotate(${-90 + start * 360} ${size / 2} ${size / 2})`}
            />
          );
        })}
      </Svg>
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>{centerValue}</Text>
        {centerLabel ? (
          <Text style={{ color: colors.textSubtle, fontSize: 11 }}>{centerLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

/** A labelled row of a chart's colour key. */
export function LegendRow({ slices }: { slices: { label: string; value: number; color: string; display: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      {slices.map((slice) => (
        <View key={slice.label} style={styles.between}>
          <View style={styles.legendLabel}>
            <View style={[styles.dot, { backgroundColor: slice.color }]} />
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{slice.label}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{slice.display}</Text>
        </View>
      ))}
    </View>
  );
}

/** A labelled figure. The building block of the summary strips on each screen. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "danger" | "warning";
}) {
  const { colors } = useTheme();
  const valueColor = {
    default: colors.text,
    accent: colors.accent,
    danger: colors.danger,
    warning: colors.warning,
  }[tone];

  return (
    <View style={{ flex: 1, gap: 4, minWidth: 88 }}>
      <Text style={{ color: colors.textSubtle, fontSize: 11, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: valueColor, fontSize: 18, fontWeight: "800" }}>{value}</Text>
      {hint ? <Text style={{ color: colors.textSubtle, fontSize: 11 }}>{hint}</Text> : null}
    </View>
  );
}

/** Evenly spaced stat tiles inside a card. */
export function StatStrip({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.strip, style]}>{children}</View>;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry,
  multiline,
  autoCapitalize = "none",
  maxLength,
  prefix,
  helper,
  error,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "decimal-pad"
    | "email-address"
    | "number-pad"
    | "phone-pad"
    | "numbers-and-punctuation";
  secureTextEntry?: boolean;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
  /** Rendered inside the field on the left, for a currency symbol. */
  prefix?: string;
  helper?: string;
  error?: string | null;
  editable?: boolean;
}) {
  const { colors, radii } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          gap: 8,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 0,
          minHeight: multiline ? 88 : 50,
          opacity: editable ? 1 : 0.6,
        }}
      >
        {prefix ? (
          <Text style={{ color: colors.textSubtle, fontSize: 16, fontWeight: "700" }}>{prefix}</Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={label}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          editable={editable}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 15,
            minHeight: multiline ? 62 : 48,
            paddingVertical: multiline ? 0 : 14,
            textAlignVertical: multiline ? "top" : "center",
          }}
        />
      </View>
      {error ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
      ) : helper ? (
        <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 17 }}>{helper}</Text>
      ) : null}
    </View>
  );
}

/** `Row` with a trailing switch. Wraps `Row` so list spacing stays consistent. */
export function ToggleRow({
  title,
  subtitle,
  icon,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  subtitle?: string | null;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={disabled ? { opacity: 0.45 } : undefined}>
      <Row
        title={title}
        subtitle={subtitle}
        icon={icon}
        right={
          <Switch
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            accessibilityLabel={title}
            trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.surfaceRaised}
          />
        }
      />
    </View>
  );
}

/** A `Row` that pushes right into a menu, for pick-one-from-many. */
export function PickerRow({
  title,
  subtitle,
  icon,
  value,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  value: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Row
      title={title}
      subtitle={subtitle}
      icon={icon}
      onPress={onPress}
      right={
        <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
          {value}
        </Text>
      }
    />
  );
}

/** Inline stepper for picking an amount in a fixed increment. */
export function Stepper({
  value,
  onChange,
  step = 50,
  min = 0,
  format,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  format: (value: number) => string;
}) {
  const { colors, radii } = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        style={({ pressed }) => [
          styles.stepButton,
          { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface },
        ]}
      >
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800", minWidth: 92, textAlign: "center" }}>
        {format(value)}
      </Text>
      <Pressable
        onPress={() => onChange(value + step)}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        style={({ pressed }) => [
          styles.stepButton,
          { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceRaised : colors.surface },
        ]}
      >
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
      <View style={{ width: radii.sm }} />
    </View>
  );
}

/** A card of mutually exclusive options, for choosing a plan or account type. */
export function ChoiceCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
  badge,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  onPress: () => void;
  badge?: string;
  disabled?: boolean;
}) {
  const { colors, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.choice,
        {
          borderRadius: radii.lg,
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceRaised : colors.surface,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <View style={styles.choiceBody}>
        {icon ? (
          <Ionicons name={icon} size={20} color={selected ? colors.accent : colors.textMuted} />
        ) : null}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.legendLabel}>
            <Text style={{ color: selected ? colors.accent : colors.text, fontSize: 15, fontWeight: "700" }}>
              {title}
            </Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: colors.accentSoft, borderRadius: radii.pill }]}>
                <Text style={{ color: colors.accent, fontSize: 10, fontWeight: "800" }}>{badge}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 17 }}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={19}
        color={selected ? colors.accent : colors.textSubtle}
      />
    </Pressable>
  );
}

/** A dot-menu trigger for card-style action lists. */
export function MoreButton({ onPress, label = "More options" }: { onPress: () => void; label?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.more, { backgroundColor: pressed ? colors.surfaceRaised : "transparent" }]}
    >
      <Ionicons name="ellipsis-horizontal" size={17} color={colors.textSubtle} />
    </Pressable>
  );
}

/** A list of `ToggleRow`s inside a `ListCard`, with insets that line up. */
export function ToggleGroup({
  title,
  children,
}: {
  title?: string;
  children: { key: string; node: React.ReactNode }[];
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {title ? (
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
      ) : null}
      <Card style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
        {children.map((child, index) => (
          <View key={child.key}>
            {child.node}
            {index < children.length - 1 ? <Divider inset={rowTextInset(20)} /> : null}
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  legendLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  barSlot: { flex: 1, height: "100%", justifyContent: "flex-end" },
  strip: { flexDirection: "row", gap: 16 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  stepButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    borderWidth: 1,
  },
  choiceBody: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3 },
  more: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10 },
});

export { styles as insightStyles };
