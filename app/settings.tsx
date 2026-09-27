import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { api } from "@/src/api/client";
import { Card, HeaderBar, Row, Screen, SectionHeader } from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { useCurrency } from "@/src/hooks/useCurrency";
import { CURRENCIES, CURRENCY_CODES, currencyName } from "@/src/lib/currency";
import { useSession } from "@/src/store/session";
import { useTheme } from "@/src/theme/ThemeProvider";

const APPEARANCE: { key: "system" | "light" | "dark"; label: string; icon: string }[] = [
  { key: "system", label: "System", icon: "phone-portrait-outline" },
  { key: "light", label: "Light", icon: "sunny-outline" },
  { key: "dark", label: "Dark", icon: "moon-outline" },
];

export default function Settings() {
  const router = useRouter();
  const { colors, radii, preference, setPreference, dark } = useTheme();
  const signOut = useSession((s) => s.signOut);
  const [signingOut, setSigningOut] = useState(false);

  const security = useApi(() => api.security.get(), []);
  const devices = useApi(() => api.security.devices(), []);
  const { currency, setCurrency } = useCurrency();
  const [savingCurrency, setSavingCurrency] = useState<string | null>(null);

  const chooseCurrency = async (next: (typeof CURRENCY_CODES)[number]) => {
    if (next === currency) return;
    setSavingCurrency(next);
    try {
      await setCurrency(next);
    } finally {
      setSavingCurrency(null);
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You will need your password or PIN to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
          router.replace("/signin");
        },
      },
    ]);
  };

  return (
    <Screen>
      <HeaderBar title="Settings" onBack={() => router.back()} />

      <SectionHeader title="Appearance" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        {APPEARANCE.map((option) => {
          const active = preference === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setPreference(option.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${option.label} theme`}
              style={{
                flex: 1,
                alignItems: "center",
                gap: 6,
                paddingVertical: 14,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accentSoft : colors.surface,
              }}
            >
              <Ionicons
                name={option.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={20}
                color={active ? colors.accent : colors.textMuted}
              />
              <Text
                style={{
                  color: active ? colors.accent : colors.textMuted,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 24 }} />

      <SectionHeader title="Currency" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {CURRENCY_CODES.map((code) => {
          const active = currency === code;
          const busy = savingCurrency === code;
          return (
            <Pressable
              key={code}
              onPress={() => chooseCurrency(code)}
              disabled={savingCurrency !== null}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: savingCurrency !== null }}
              accessibilityLabel={`${currencyName(code)}, ${code}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 11,
                paddingHorizontal: 14,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accentSoft : colors.surface,
                opacity: savingCurrency !== null && !busy ? 0.5 : 1,
              }}
            >
              <Text style={{ color: active ? colors.accent : colors.text, fontSize: 16 }}>
                {CURRENCIES[code].symbol}
              </Text>
              <Text
                style={{
                  color: active ? colors.accent : colors.textMuted,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {code}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 12,
          marginTop: 10,
          lineHeight: 17,
        }}
      >
        Balances and amounts are shown in {currencyName(currency)} ({currency}).
        This is a display setting only; it does not convert between currencies.
      </Text>

      <View style={{ height: 24 }} />

      <SectionHeader title="Security" />
      <Card style={{ paddingVertical: 4 }}>
        <Row
          title="Transaction PIN"
          subtitle={security.data ? "Change your 4-digit PIN" : "Loading"}
          chevron
          onPress={() => router.push("/securitysettings")}
        />
        <Row
          title="Two-factor authentication"
          subtitle={security.data?.twoFactorEnabled ? "Enabled" : "Not enabled"}
          chevron
          onPress={() => router.push("/securitysettings")}
        />
        <Row
          title="Biometric unlock"
          subtitle={security.data?.biometricsEnabled ? "Enabled on this device" : "Disabled"}
          chevron
          onPress={() => router.push("/securitysettings")}
        />
        <Row
          title="Devices"
          subtitle={`${devices.data?.length ?? 0} signed-in device${devices.data?.length === 1 ? "" : "s"}`}
          chevron
          onPress={() => router.push("/securitysettings")}
        />
      </Card>

      <View style={{ height: 24 }} />

      <SectionHeader title="Support" />
      <Card style={{ paddingVertical: 4 }}>
        <Row
          title="Help centre"
          subtitle="Answers to common questions"
          chevron
          onPress={() => router.push("/helpsupport")}
        />
        <Row
          title="Privacy policy"
          subtitle="How we handle your data"
          chevron
          onPress={() => router.push("/privacy")}
        />
      </Card>

      <View style={{ height: 24 }} />

      <Pressable
        onPress={confirmSignOut}
        disabled={signingOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        style={({ pressed }) => [
          {
            alignItems: "center",
            paddingVertical: 15,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.danger,
            backgroundColor: pressed ? colors.dangerSoft : "transparent",
          },
        ]}
      >
        <Text style={{ color: colors.danger, fontSize: 15, fontWeight: "700" }}>
          {signingOut ? "Signing out…" : "Sign out"}
        </Text>
      </Pressable>

      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 12,
          textAlign: "center",
          marginTop: 16,
        }}
      >
        INVETO 1.0.1 · {dark ? "Dark" : "Light"} theme
      </Text>
    </Screen>
  );
}
