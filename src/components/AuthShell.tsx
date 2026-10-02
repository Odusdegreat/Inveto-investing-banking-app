import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps, ViewStyle } from "react-native";

import { Logo } from "@/src/components/marks";
import { useTheme } from "@/src/theme/ThemeProvider";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Logo size={36} />
          <Text style={[styles.brandName, { color: colors.text }]}>INVETO</Text>
        </View>

        <View style={styles.heading}>
          <Text style={{ color: colors.text, fontSize: 32, lineHeight: 38, fontWeight: "800" }}>
            {title}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.body}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  /** Small inline link rendered on the right of the label, e.g. "Forgot password?". */
  action?: { label: string; onPress: () => void };
  /** Rendered under the input, below any hint/error. Use for password meters. */
  footer?: React.ReactNode;
  containerStyle?: ViewStyle;
} & Omit<TextInputProps, "style" | "value" | "onChangeText" | "onBlur">;

export function Field({
  label,
  error,
  hint,
  value,
  onChangeText,
  onBlur,
  action,
  footer,
  containerStyle,
  secureTextEntry,
  ...rest
}: FieldProps) {
  const { colors, radii } = useTheme();
  const [revealed, setRevealed] = useState(false);

  const isSecret = Boolean(secureTextEntry);
  const toggleLabel = revealed ? "Hide" : "Show";

  return (
    <View style={[{ gap: 8 }, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
          {label}
        </Text>
        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={10}
          >
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          secureTextEntry={isSecret ? !revealed : secureTextEntry}
          {...rest}
          style={[
            styles.input,
            {
              borderRadius: radii.md,
              borderColor: error ? colors.danger : colors.border,
              backgroundColor: colors.surface,
              color: colors.text,
              paddingRight: isSecret ? 52 : 16,
            },
          ]}
        />

        {isSecret ? (
          <Pressable
            onPress={() => setRevealed((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={`${toggleLabel} ${label.toLowerCase()}`}
            accessibilityState={{ selected: revealed }}
            hitSlop={12}
            style={({ pressed }) => [
              styles.reveal,
              {
                backgroundColor: pressed ? colors.surfaceRaised : "transparent",
                borderRadius: radii.sm,
              },
            ]}
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={revealed ? colors.accent : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={{ color: colors.danger, fontSize: 12, lineHeight: 17 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 17 }}>
          {hint}
        </Text>
      ) : null}

      {footer}
    </View>
  );
}

export const PASSWORD_RULES = [
  "At least 8 characters",
  "One uppercase letter",
  "One lowercase letter",
  "One number",
] as const;

export function passwordScore(value: string) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}

const PASSWORD_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

export function PasswordStrength({ value }: { value: string }) {
  const { colors, radii } = useTheme();
  const score = passwordScore(value);

  const tone =
    score <= 1
      ? colors.danger
      : score === 2
        ? colors.warning
        : colors.accent;

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.meterRow}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.meterSegment,
              {
                borderRadius: radii.pill,
                backgroundColor: step <= score ? tone : colors.surfaceRaised,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.meterLabelRow}>
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: value ? tone : colors.textSubtle, fontSize: 12, fontWeight: "700" }}
        >
          {value ? `${PASSWORD_LABELS[score]} password` : "Password strength"}
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>8+ characters</Text>
      </View>
    </View>
  );
}

export function PasswordRules({ value }: { value: string }) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      {PASSWORD_RULES.map((rule) => {
        const met = isPasswordRuleMet(rule, value);
        return (
          <View key={rule} style={styles.ruleRow}>
            <Ionicons
              name={met ? "checkmark-circle" : "ellipse-outline"}
              size={15}
              color={met ? colors.accent : colors.textSubtle}
            />
            <Text
              style={{
                color: met ? colors.textMuted : colors.textSubtle,
                fontSize: 12,
                lineHeight: 17,
              }}
            >
              {rule}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function isPasswordRuleMet(rule: string, value: string) {
  switch (rule) {
    case "At least 8 characters":
      return value.length >= 8;
    case "One uppercase letter":
      return /[A-Z]/.test(value);
    case "One lowercase letter":
      return /[a-z]/.test(value);
    case "One number":
      return /\d/.test(value);
    default:
      return false;
  }
}

export function AuthLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={12}>
      <Text
        style={{
          color: colors.accent,
          fontSize: 15,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 56,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  brandName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heading: {
    gap: 10,
    marginBottom: 36,
  },
  body: {
    gap: 22,
  },
  footer: {
    marginTop: 36,
    gap: 20,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  reveal: {
    position: "absolute",
    right: 6,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  meterRow: {
    flexDirection: "row",
    gap: 6,
  },
  meterSegment: {
    flex: 1,
    height: 5,
  },
  meterLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
});
