import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import Logo from "@/assets/logo.svg";
import { api } from "@/src/api/client";
import {
  Card,
  Divider,
  ErrorState,
  HeaderBar,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { useSession } from "@/src/store/session";
import { useTheme } from "@/src/theme/ThemeProvider";

export default function UserScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const signOut = useSession((s) => s.signOut);
  const [busy, setBusy] = useState(false);

  const { data: user, loading, error, reload } = useApi(() => api.user.get(), []);
  const accounts = useApi(() => api.accounts.list(), []);
  const holdings = useApi(() => api.investing.holdings(), []);

  const initials = (user?.fullName ?? "IV")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const invested = (holdings.data ?? []).reduce(
    (sum, holding) => sum + holding.units * holding.averageCost,
    0,
  );

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You will need your password or PIN to sign back in.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          await signOut();
          setBusy(false);
          router.replace("/signin");
        },
      },
    ]);
  };

  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <HeaderBar
        title="Profile"
        right={
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            hitSlop={8}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        }
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <View style={{ alignItems: "center", gap: 10, paddingVertical: 12 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 30,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accentSoft,
            borderWidth: 1,
            borderColor: colors.accentBorder,
          }}
        >
          <Text style={{ color: colors.accent, fontSize: 28, fontWeight: "800" }}>
            {initials}
          </Text>
        </View>
        {loading && !user ? (
          <Skeleton height={18} width={160} />
        ) : (
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
            {user?.fullName ?? "Guest"}
          </Text>
        )}
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {user?.email}
        </Text>
        {user?.tier ? (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: radii.pill,
              backgroundColor: colors.accentSoft,
            }}
          >
            <Text
              style={{ color: colors.accent, fontSize: 11, fontWeight: "800" }}
            >
              {user.tier.toUpperCase()} MEMBER
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ height: 12 }} />

      <Card style={{ padding: 18, flexDirection: "row" }}>
        <Metric
          label="Accounts"
          value={String(accounts.data?.length ?? 0)}
        />
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <Metric
          label="Invested"
          value={holdings.loading ? "—" : invested.toFixed(0)}
        />
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <Metric label="Tier" value={user?.tier ?? "—"} />
      </Card>

      <View style={{ height: 24 }} />

      <SectionHeader title="Manage" />
      <Card style={{ paddingVertical: 4 }}>
        <Row
          title="Edit profile"
          icon="person-outline"
          chevron
          onPress={() => router.push("/editprofile")}
        />
        <Divider inset={16} />
        <Row
          title="Accounts"
          subtitle="Balances and account details"
          icon="wallet-outline"
          chevron
          onPress={() => router.push("/accounts")}
        />
        <Divider inset={16} />
        <Row
          title="Payment methods"
          icon="card-outline"
          chevron
          onPress={() => router.push("/paymentmethods")}
        />
        <Divider inset={16} />
        <Row
          title="Security"
          icon="shield-checkmark-outline"
          chevron
          onPress={() => router.push("/securitysettings")}
        />
        <Divider inset={16} />
        <Row
          title="Settings"
          subtitle="Theme and preferences"
          icon="options-outline"
          chevron
          onPress={() => router.push("/settings")}
        />
      </Card>

      <View style={{ height: 24 }} />

      <SectionHeader title="Support" />
      <Card style={{ paddingVertical: 4 }}>
        <Row
          title="Help & support"
          icon="help-circle-outline"
          chevron
          onPress={() => router.push("/helpsupport")}
        />
        <Divider inset={16} />
        <Row
          title="Privacy policy"
          icon="document-text-outline"
          chevron
          onPress={() => router.push("/privacy")}
        />
      </Card>

      <View style={{ height: 24 }} />

      <Pressable
        onPress={confirmSignOut}
        disabled={busy}
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
          {busy ? "Signing out…" : "Sign out"}
        </Text>
      </Pressable>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 20,
        }}
      >
        <Logo width={16} height={16} />
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>INVETO</Text>
      </View>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
        {value}
      </Text>
      <Text style={{ color: colors.textSubtle, fontSize: 11 }}>{label}</Text>
    </View>
  );
}
