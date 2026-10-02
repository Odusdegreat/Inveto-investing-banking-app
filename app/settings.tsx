import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { api } from "@/src/api/client";
import {
  Button,
  Divider,
  HeaderBar,
  ListCard,
  Row,
  Screen,
  SectionHeader,
  rowTextInset,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { useCurrency } from "@/src/hooks/useCurrency";
import { CURRENCIES, CURRENCY_CODES, currencyName } from "@/src/lib/currency";
import { useSession } from "@/src/store/session";
import { useTheme } from "@/src/theme/ThemeProvider";

/** Row has only 4pt of its own padding, so lists need this to breathe. */
const LIST_CARD = { paddingHorizontal: 12 };

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
    Alert.alert("Sign out?", "You will need to sign in again to access your account.", [
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
    <Screen gap={24}>
      <HeaderBar title="Settings" onBack={() => router.back()} />

      <ListCard style={LIST_CARD}>
        <Row
          title="Notification settings"
          icon="notifications-outline"
          chevron
          onPress={() => router.push("/notification-settings")}
        />
        <Divider inset={rowTextInset(20)} />
        <Row
          title="Verify email"
          icon="mail-outline"
          chevron
          onPress={() => router.push("/verify-email")}
        />
        <Divider inset={rowTextInset(20)} />
        <Row
          title="Advanced settings"
          subtitle="Privacy, alerts and app behaviour"
          icon="options-outline"
          chevron
          onPress={() => router.push("/settings-advanced")}
        />
        <Divider inset={rowTextInset(20)} />
        <Row
          title="Passkeys"
          icon="finger-print-outline"
          chevron
          onPress={() => router.push("/biometrics")}
        />
      </ListCard>
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

      <SectionHeader title="Security" />
      <ListCard style={LIST_CARD}>
        <Row
          title="Transaction PIN"
          subtitle={security.data ? "Change your 4-digit PIN" : "Loading"}
          icon="key-outline"
          chevron
          onPress={() => router.push("/securitysettings")}
        />
        <Divider inset={rowTextInset(20)} />
        <Row
          title="Two-factor authentication"
          subtitle={security.data?.twoFactorEnabled ? "Enabled" : "Not enabled"}
          icon="shield-checkmark-outline"
          chevron
          onPress={() => router.push("/securitysettings")}
        />
        <Divider inset={rowTextInset(20)} />
        <Row
          title="Biometric unlock"
          subtitle={security.data?.biometricsEnabled ? "Enabled on this device" : "Disabled"}
          icon="finger-print-outline"
          chevron
          onPress={() => router.push("/securitysettings")}
        />
        <Divider inset={rowTextInset(20)} />
        <Row
          title="Devices"
          subtitle={`${devices.data?.length ?? 0} signed-in device${devices.data?.length === 1 ? "" : "s"}`}
          icon="phone-portrait-outline"
          chevron
          onPress={() => router.push("/securitysettings")}
        />
      </ListCard>

      <SectionHeader title="Support" />
      <ListCard style={LIST_CARD}>
        <Row
          title="Help centre"
          subtitle="Answers to common questions"
          icon="help-circle-outline"
          chevron
          onPress={() => router.push("/helpsupport")}
        />
        <Divider inset={rowTextInset(20)} />
        <Row
          title="Support tickets"
          subtitle="Raise and track a request"
          icon="chatbubbles-outline"
          chevron
          onPress={() => router.push("/tickets")}
        />
        <Divider inset={rowTextInset(20)} />
        <Row
          title="Privacy policy"
          subtitle="How we handle your data"
          icon="document-text-outline"
          chevron
          onPress={() => router.push("/privacy")}
        />
        <Divider inset={rowTextInset(20)} />
        <Row
          title="Take the tour"
          subtitle="A quick walkthrough of the app"
          icon="school-outline"
          chevron
          onPress={() => router.push("/onboarding")}
        />
      </ListCard>

      <Button
        label={signingOut ? "Signing out…" : "Sign out"}
        icon="log-out-outline"
        variant="dangerOutline"
        loading={signingOut}
        onPress={confirmSignOut}
      />

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
