import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api/client";
import { Logo, TransactionIcon } from "@/src/components/marks";
import {
  Card,
  Divider,
  ErrorState,
  IconBadge,
  Screen,
  Section,
  Skeleton,
  rowTextInset,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatDate, formatMoney } from "@/src/lib/format";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Transaction } from "@/src/types";

const ACTIONS = [
  { href: "/transfer", label: "Send", icon: "arrow-up-outline", tone: "accent" as const },
  { href: "/receive", label: "Receive", icon: "arrow-down-outline", tone: "success" as const },
  { href: "/sandbox-topup", label: "Add Money", icon: "cash-outline", tone: "warning" as const },
  { href: "/accounts", label: "Accounts", icon: "wallet-outline", tone: "neutral" as const },
  { href: "/investing", label: "Invest", icon: "trending-up-outline", tone: "accent" as const },
] as const;

const EXPLORE = [
  { href: "/budgeting", label: "Budgets", subtitle: "Where your money went", icon: "pie-chart-outline", tone: "accent" as const },
  { href: "/savings-goals", label: "Goals", subtitle: "Save towards a target", icon: "flag-outline", tone: "success" as const },
  { href: "/bills", label: "Bills", subtitle: "Pay and manage autopay", icon: "receipt-outline", tone: "warning" as const },
  { href: "/recurring-transfers", label: "Standing orders", subtitle: "Payments on a schedule", icon: "repeat-outline", tone: "neutral" as const },
  { href: "/cards", label: "Cards", subtitle: "Freeze and set limits", icon: "card-outline", tone: "accent" as const },
  { href: "/loans", label: "Borrowing", subtitle: "Loans and advances", icon: "cash-outline", tone: "success" as const },
  { href: "/statements", label: "Statements", subtitle: "PDF, CSV or OFX", icon: "document-text-outline", tone: "warning" as const },
  { href: "/verification", label: "Verification", subtitle: "Your tier and checks", icon: "shield-checkmark-outline", tone: "neutral" as const },
  { href: "/portfolio-analytics", label: "Analytics", subtitle: "Allocation and yield", icon: "analytics-outline", tone: "accent" as const },
  { href: "/open-account", label: "Open an account", subtitle: "Savings or fixed deposit", icon: "add-circle-outline", tone: "success" as const },
  { href: "/external-transfer", label: "External transfer", subtitle: "Send or request money", icon: "swap-horizontal-outline", tone: "warning" as const },
  { href: "/referral", label: "Refer a friend", subtitle: "Earn for every invite", icon: "gift-outline", tone: "neutral" as const },
];

export default function HomeScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();

  const user = useApi(() => api.user.get(), []);
  const accounts = useApi(() => api.accounts.list(), []);
  const transactions = useApi(() => api.transactions.list(), []);

  const reloadAll = async () => {
    await Promise.all([user.reload(), accounts.reload(), transactions.reload()]);
  };

  const firstName = (user.data?.fullName ?? "there").split(" ")[0];

  const balances = accounts.data ?? [];
  const total = balances.reduce((sum, account) => sum + account.balance, 0);
  const currency = balances[0]?.currency ?? DEFAULT_CURRENCY;
  const savings = balances
    .filter((account) => account.kind === "savings")
    .reduce((sum, account) => sum + account.balance, 0);
  const wallet = balances
    .filter((account) => account.kind === "wallet" || account.kind === "current")
    .reduce((sum, account) => sum + account.balance, 0);

  return (
    <Screen
      gap={22}
      onRefresh={reloadAll}
      refreshing={accounts.loading || transactions.loading}
    >
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Logo size={26} />
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>
            INVETO
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={() => router.push("/search")}
            accessibilityRole="button"
            accessibilityLabel="Search"
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderRadius: radii.md,
                backgroundColor: pressed ? colors.surface : colors.surfaceRaised,
              },
            ]}
          >
            <Ionicons name="search" size={19} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderRadius: radii.md,
                backgroundColor: pressed ? colors.surface : colors.surfaceRaised,
              },
            ]}
          >
            <Ionicons name="notifications-outline" size={19} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.greeting}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
          Hi, {firstName}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 21 }}>
          Here is your money today.
        </Text>
      </View>

      {accounts.error ? (
        <ErrorState message={accounts.error} onRetry={reloadAll} />
      ) : null}

      <Card style={styles.balanceCard}>
        <View style={styles.balanceHead}>
          <Text style={{ color: colors.textSubtle, fontSize: 13 }}>Total balance</Text>
          <Pressable
            onPress={() => router.push("/accounts")}
            accessibilityRole="button"
            accessibilityLabel="View all accounts"
            hitSlop={8}
          >
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "700" }}>
              {balances.length} account{balances.length === 1 ? "" : "s"}
            </Text>
          </Pressable>
        </View>

        {accounts.loading && !balances.length ? (
          <Skeleton height={36} width="60%" />
        ) : (
          <Text style={{ color: colors.text, fontSize: 34, fontWeight: "800" }}>
            {formatMoney(total, currency)}
          </Text>
        )}

        <View style={styles.progressRow}>
          <Progress
            label="Savings"
            value={savings}
            total={total}
            tone={colors.accent}
          />
          <Progress
            label="Available"
            value={wallet}
            total={total}
            tone={colors.warning}
          />
        </View>
      </Card>

      <View style={styles.actions}>
        {ACTIONS.map((action) => {
          const toneColors = {
            accent: { border: colors.accent, text: colors.accent },
            success: { border: colors.accent, text: colors.accent },
            warning: { border: colors.warning, text: colors.warning },
            neutral: { border: colors.border, text: colors.textMuted },
            danger: { border: colors.danger, text: colors.danger },
          }[action.tone];
          return (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.href as never)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => [
                styles.action,
                {
                  borderRadius: radii.lg,
                  borderColor: toneColors.border,
                  backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
                },
              ]}
            >
              <IconBadge icon={action.icon} size={44} tone={action.tone} />
              <Text style={[styles.actionLabel, { color: toneColors.text }]}>{action.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Section
        title="Explore"
        action="See all"
        onAction={() => router.push("/user")}
        gap={12}
      >
        <View style={styles.exploreGrid}>
          {EXPLORE.map((item) => (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as never)}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}. ${item.subtitle}`}
              style={({ pressed }) => [
                styles.exploreTile,
                {
                  borderRadius: radii.lg,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
                },
              ]}
            >
              <IconBadge
                icon={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={36}
                tone={item.tone}
              />
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>
                  {item.label}
                </Text>
                <Text style={{ color: colors.textSubtle, fontSize: 11 }} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section
        title="Recent activity"
        action="See all"
        onAction={() => router.push("/transactions")}
        gap={12}
      >
        {transactions.loading && !transactions.data ? (
          <Card style={{ padding: 20, gap: 18 }}>
            <Skeleton height={44} />
            <Skeleton height={44} width="80%" />
          </Card>
        ) : transactions.data?.length ? (
          <Card style={{ paddingVertical: 6 }}>
            {transactions.data.map((transaction, index) => (
              <View key={transaction.id}>
                <TransactionRow
                  item={transaction}
                  onPress={() =>
                    router.push(`/transaction/${transaction.id}` as never)
                  }
                />
                {index < transactions.data!.length - 1 ? (
                  <Divider inset={rowTextInset(40)} />
                ) : null}
              </View>
            ))}
          </Card>
        ) : (
          <Card style={{ padding: 20 }}>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
              No activity yet. Once money moves in or out it will show up here.
            </Text>
          </Card>
        )}
      </Section>
    </Screen>
  );
}

function Progress({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const { colors, radii } = useTheme();
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: percent,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [percent, progress]);

  const width = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", `${percent}%`],
  });

  return (
    <View style={styles.progress}>
      <View style={styles.progressHead}>
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700" }}>
          {percent}%
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${label} share of total balance`}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={[
          styles.progressTrack,
          { borderRadius: radii.pill, backgroundColor: colors.surfaceSunken },
        ]}
      >
        <Animated.View
          style={[styles.progressFill, { width, borderRadius: radii.pill, backgroundColor: tone }]}
        />
      </View>
    </View>
  );
}

function TransactionRow({
  item,
  onPress,
}: {
  item: Transaction;
  onPress: () => void;
}) {
  const { colors, radii } = useTheme();
  const incoming = item.amount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${formatMoney(item.amount, item.currency, { sign: true })}, ${formatDate(item.createdAt)}`}
      style={({ pressed }) => [
        styles.transactionRow,
        {
          borderRadius: radii.md,
          backgroundColor: pressed ? colors.surfaceRaised : "transparent",
        },
      ]}
    >
      <TransactionIcon kind={item.kind} category={item.category} amount={item.amount} />
      <View style={styles.transactionBody}>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}
        >
          {item.title}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: 13 }}>
          {formatDate(item.createdAt)}
          {item.status !== "completed" ? ` · ${item.status}` : ""}
        </Text>
      </View>
      <Text
        style={{
          color: incoming ? colors.accent : colors.text,
          fontSize: 15,
          fontWeight: "700",
        }}
      >
        {formatMoney(item.amount, item.currency, { sign: true })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    gap: 6,
  },
  balanceCard: {
    padding: 20,
    gap: 8,
  },
  balanceHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  progressRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 14,
  },
  progress: {
    flex: 1,
    gap: 8,
  },
  progressHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  progressTrack: {
    height: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  action: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 0,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  exploreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  exploreTile: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  transactionBody: {
    flex: 1,
    gap: 3,
  },
});
