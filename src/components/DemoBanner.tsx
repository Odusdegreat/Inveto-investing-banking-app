import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useDemo } from "@/src/context/DemoContext";
import { useTheme } from "@/src/theme/ThemeProvider";

export function DemoBanner() {
  const { isDemo } = useDemo();
  const { colors } = useTheme();

  if (!isDemo) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
      <Text style={[styles.text, { color: colors.warningText }]}>
        ⚠ Simulated payments. No real money is moved.
      </Text>
    </View>
  );
}

export function DemoBannerInline() {
  const { isDemo } = useDemo();
  const { colors } = useTheme();

  if (!isDemo) return null;

  return (
    <View style={[styles.inlineBanner, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
      <Text style={[styles.inlineText, { color: colors.warningText }]}>
        Simulated payments. No real money is moved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  inlineBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  inlineText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});