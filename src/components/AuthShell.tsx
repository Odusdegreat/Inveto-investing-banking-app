import React from "react";
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
import type { TextInputProps } from "react-native";

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
        <View style={{ gap: 6, marginBottom: 28 }}>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>
            {title}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 15 }}>
            {subtitle}
          </Text>
        </View>

        <View style={{ gap: 16 }}>{children}</View>

        {footer ? <View style={{ marginTop: 20 }}>{footer}</View> : null}
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
} & Omit<TextInputProps, "style" | "value" | "onChangeText" | "onBlur">;

export function Field({
  label,
  error,
  hint,
  value,
  onChangeText,
  onBlur,
  ...rest
}: FieldProps) {
  const { colors, radii } = useTheme();

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        {...rest}
        style={{
          minHeight: 50,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: colors.surface,
          color: colors.text,
          paddingHorizontal: 14,
          fontSize: 15,
        }}
      />
      {error ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>{hint}</Text>
      ) : null}
    </View>
  );
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
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      <Text
        style={{
          color: colors.accent,
          fontSize: 14,
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
    paddingBottom: 40,
  },
});
