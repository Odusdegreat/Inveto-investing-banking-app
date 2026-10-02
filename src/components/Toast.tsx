import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { useTheme } from "@/src/theme/ThemeProvider";

type Tone = "success" | "error" | "info";
type Notice = { id: number; message: string; tone: Tone };
let nextId = 0;
const useToasts = create<{ notices: Notice[] }>(() => ({ notices: [] }));
function dismiss(id: number) {
  useToasts.setState(({ notices }) => ({ notices: notices.filter((item) => item.id !== id) }));
}
function show(message: string, tone: Tone) {
  const notice = { id: ++nextId, message, tone };
  useToasts.setState(({ notices }) => ({ notices: [...notices.filter((item) => item.message !== message), notice].slice(-3) }));
}
export const toast = {
  success: (message: string) => show(message, "success"),
  error: (message: string) => show(message, "error"),
  info: (message: string) => show(message, "info"),
  dismiss,
};
export function errorMessage(error: unknown, fallback = "Something went wrong. Try again.") {
  return error instanceof Error ? error.message : fallback;
}
function ToastItem({ notice }: { notice: Notice }) {
  const { colors, radii } = useTheme();
  const color = notice.tone === "error" ? colors.danger : notice.tone === "success" ? colors.accent : colors.text;
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(notice.message);
    const timer = setTimeout(() => dismiss(notice.id), notice.tone === "error" ? 8000 : 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceRaised, borderColor: color, borderWidth: 1, borderRadius: radii.lg, padding: 14, elevation: 12, boxShadow: "0 4px 18px rgba(0,0,0,0.2)" }}>
      <Ionicons name={notice.tone === "success" ? "checkmark-circle" : notice.tone === "error" ? "alert-circle" : "information-circle"} size={22} color={color} />
      <Text style={{ flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 }}>{notice.message}</Text>
      <Pressable onPress={() => dismiss(notice.id)} accessibilityRole="button" accessibilityLabel="Dismiss notification" hitSlop={12} style={{ padding: 6 }}>
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
export function ToastViewport() {
  const notices = useToasts((state) => state.notices);
  const insets = useSafeAreaInsets();
  return (
    <View style={{ pointerEvents: "box-none", position: "absolute", top: insets.top + 12, left: 16, right: 16, gap: 8, zIndex: 9999, maxWidth: 560, alignSelf: "center" }}>
      {notices.map((notice) => <ToastItem key={notice.id} notice={notice} />)}
    </View>
  );
}
