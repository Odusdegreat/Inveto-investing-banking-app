import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api/client";
import {
  Button,
  Card,
  Divider,
  ErrorState,
  HeaderBar,
  ListCard,
  Row,
  Screen,
  Section,
  Skeleton,
  rowTextInset,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatDate, formatMoney, initials } from "@/src/lib/format";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
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

  const invested = (holdings.data ?? []).reduce(
    (sum, holding) => sum + holding.units * holding.averageCost,
    0,
  );
  const total = (accounts.data ?? []).reduce((sum, a) => sum + a.balance, 0);
  const currency = accounts.data?.[0]?.currency ?? DEFAULT_CURRENCY;

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
    <Screen gap={24} onRefresh={reload} refreshing={loading}>
      <HeaderBar
        title="Profile"
        right={
          <Pressable
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderRadius: radii.md,
                backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
              },
            ]}
          >
            <Ionicons name="settings-outline" size={19} color={colors.text} />
          </Pressable>
        }
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <View style={styles.identity}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.accentSoft,
              borderColor: colors.accentBorder,
            },
          ]}
        >
          <Text style={{ color: colors.accent, fontSize: 30, fontWeight: "800" }}>
            {user ? initials(user.fullName) : "··"}
          </Text>
        </View>

        {loading && !user ? (
          <Skeleton height={20} width={170} />
        ) : (
          <Text style={{ color: colors.text, fontSize: 21, fontWeight: "800" }}>
            {user?.fullName ?? "Guest"}
          </Text>
        )}

        <Text style={[styles.email, { color: colors.textMuted }]}>
          {user?.email ?? ""}
        </Text>

        {user?.tier ? (
          <View
            style={[
              styles.tier,
              { borderRadius: radii.pill, backgroundColor: colors.accentSoft },
            ]}
          >
            <Ionicons name="sparkles" size={11} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 11, fontWeight: "800" }}>
              {user.tier.toUpperCase()} MEMBER
            </Text>
          </View>
        ) : null}
      </View>

      <Card style={styles.metrics}>
        <Metric
          label="Total balance"
          value={formatMoney(total, currency, { compact: true })}
        />
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <Metric
          label="Invested"
          value={
            holdings.loading ? "—" : formatMoney(invested, currency, { compact: true })
          }
        />
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <Metric label="Member since" value={user ? formatDate(user.memberSince) : "—"} />
      </Card>

      <Section title="Banking" gap={14}>
        <ListCard style={styles.listCard}>
          <Row
            title="Search everything"
            subtitle="Transactions, people and settings"
            icon="search-outline"
            chevron
            onPress={() => router.push("/search")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Cards"
            subtitle="Freeze, limits and card controls"
            icon="card-outline"
            chevron
            onPress={() => router.push("/cards")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Budgets and goals"
            subtitle="Where your money is going and coming from"
            icon="pie-chart-outline"
            chevron
            onPress={() => router.push("/budgeting")}
          />
        </ListCard>
      </Section>

      <Section title="Move money" gap={14}>
        <ListCard style={styles.listCard}>
          <Row
            title="Open an account"
            subtitle="Savings, current or fixed deposit"
            icon="add-circle-outline"
            chevron
            onPress={() => router.push("/open-account")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="External transfer"
            subtitle="Send or request from another bank"
            icon="swap-horizontal-outline"
            chevron
            onPress={() => router.push("/external-transfer")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Standing orders"
            subtitle="Regular payments on a schedule"
            icon="repeat-outline"
            chevron
            onPress={() => router.push("/recurring-transfers")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Bills and payees"
            subtitle="Pay bills and manage autopay"
            icon="receipt-outline"
            chevron
            onPress={() => router.push("/bills")}
          />
        </ListCard>
      </Section>

      <Section title="Grow and borrow" gap={14}>
        <ListCard style={styles.listCard}>
          <Row
            title="Savings goals"
            subtitle="Track a target and contribute to it"
            icon="flag-outline"
            chevron
            onPress={() => router.push("/savings-goals")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Portfolio analytics"
            subtitle="Allocation, yield and costs"
            icon="analytics-outline"
            chevron
            onPress={() => router.push("/portfolio-analytics")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Borrowing"
            subtitle="Loans, salary advances and credit"
            icon="cash-outline"
            chevron
            onPress={() => router.push("/loans")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Verification"
            subtitle="Your tier and outstanding checks"
            icon="shield-checkmark-outline"
            chevron
            onPress={() => router.push("/verification")}
          />
        </ListCard>
      </Section>

      <Section title="Records and rewards" gap={14}>
        <ListCard style={styles.listCard}>
          <Row
            title="Statements"
            subtitle="Download PDF, CSV or OFX"
            icon="document-text-outline"
            chevron
            onPress={() => router.push("/statements")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Refer a friend"
            subtitle="Earn for every invite"
            icon="gift-outline"
            chevron
            onPress={() => router.push("/referral")}
          />
        </ListCard>
      </Section>

      <Section title="Manage" gap={14}>
        <ListCard style={styles.listCard}>
          <Row
            title="Edit profile"
            icon="person-outline"
            chevron
            onPress={() => router.push("/editprofile")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Accounts"
            subtitle={`${accounts.data?.length ?? 0} open`}
            icon="wallet-outline"
            chevron
            onPress={() => router.push("/accounts")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Payment methods"
            icon="card-outline"
            chevron
            onPress={() => router.push("/paymentmethods")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Security"
            icon="shield-checkmark-outline"
            chevron
            onPress={() => router.push("/securitysettings")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Settings"
            subtitle="Theme and preferences"
            icon="options-outline"
            chevron
            onPress={() => router.push("/settings")}
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
            title="Take the tour"
            subtitle="A quick walkthrough of the app"
            icon="school-outline"
            chevron
            onPress={() => router.push("/onboarding")}
          />
        </ListCard>
      </Section>

      <Section title="Support" gap={14}>
        <ListCard style={styles.listCard}>
          <Row
            title="Help & support"
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
            icon="document-text-outline"
            chevron
            onPress={() => router.push("/privacy")}
          />
        </ListCard>
      </Section>

      <Section title="Session" gap={14}>
        <Button
          label={busy ? "Signing out…" : "Sign out"}
          icon="log-out-outline"
          variant="dangerOutline"
          loading={busy}
          onPress={confirmSignOut}
        />
      </Section>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <Text
        numberOfLines={1}
        style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}
      >
        {value}
      </Text>
      <Text style={{ color: colors.textSubtle, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  email: {
    fontSize: 14,
  },
  tier: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metrics: {
    flexDirection: "row",
    paddingVertical: 22,
    paddingHorizontal: 12,
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 6,
  },
  metricDivider: {
    width: 1,
  },
  listCard: {
    paddingHorizontal: 12,
  },
});
