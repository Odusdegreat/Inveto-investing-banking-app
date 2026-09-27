import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

import Logo from "@/assets/logo.svg";
import { api } from "@/src/api/client";
import { TransactionIcon } from "@/src/components/marks";
import {
  Card,
  ErrorState,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatDate, formatMoney } from "@/src/lib/format";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Transaction } from "@/src/types";

const ACTIONS = [
  { href: "/transfer", label: "Send", icon: "arrow-up-outline" },
  { href: "/transfer", label: "Request", icon: "arrow-down-outline" },
  { href: "/accounts", label: "Accounts", icon: "wallet-outline" },
  { href: "/investing", label: "Invest", icon: "trending-up-outline" },
] as const;

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
      onRefresh={reloadAll}
      refreshing={accounts.loading || transactions.loading}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Logo width={26} height={26} />
        <Text style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}>
          INVETO
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/notifications")}
        accessibilityRole="button"
        accessibilityLabel="Open notifications"
        hitSlop={8}
        style={{
          position: "absolute",
          right: 20,
          top: 48,
          width: 38,
          height: 38,
          borderRadius: 13,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceRaised,
        }}
      >
        <Ionicons name="notifications-outline" size={19} color={colors.text} />
      </Pressable>

      <View style={{ marginTop: 24, marginBottom: 20 }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: "800" }}>
          Hi, {firstName}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 2 }}>
          Here is your money today.
        </Text>
      </View>

      {accounts.error ? (
        <ErrorState message={accounts.error} onRetry={reloadAll} />
      ) : null}

      <Card style={{ padding: 18, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ color: colors.textSubtle, fontSize: 12, flex: 1 }}>
            Total balance
          </Text>
          <Pressable
            onPress={() => router.push("/accounts")}
            accessibilityRole="button"
            accessibilityLabel="View all accounts"
            hitSlop={8}
          >
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>
              {balances.length} accounts
            </Text>
          </Pressable>
        </View>

        {accounts.loading && !balances.length ? (
          <View style={{ marginTop: 10, gap: 8 }}>
            <Skeleton height={32} width="60%" />
          </View>
        ) : (
          <Text
            style={{
              color: colors.text,
              fontSize: 32,
              fontWeight: "800",
              marginTop: 4,
            }}
          >
            {formatMoney(total, currency)}
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
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

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.href as never)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [
              {
                flex: 1,
                alignItems: "center",
                gap: 7,
                paddingVertical: 14,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
              },
            ]}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accentSoft,
              }}
            >
              <Ionicons
                name={action.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={18}
                color={colors.accent}
              />
            </View>
            <Text
              style={{ color: colors.textMuted, fontSize: 11, fontWeight: "600" }}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader
        title="Recent activity"
        action="See all"
        onAction={() => router.push("/transactions")}
      />

      {transactions.loading && !transactions.data ? (
        <Card style={{ padding: 16, gap: 14 }}>
          <Skeleton height={44} />
          <Skeleton height={44} width="80%" />
        </Card>
      ) : transactions.data?.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {transactions.data.map((transaction, index) => (
            <View key={transaction.id}>
              <TransactionRow
                item={transaction}
                onPress={() =>
                  router.push(`/transaction/${transaction.id}` as never)
                }
              />
              {index < transactions.data!.length - 1 ? (
                <View
                  style={{
                    height: 1,
                    marginLeft: 64,
                    backgroundColor: colors.border,
                  }}
                />
              ) : null}
            </View>
          ))}
        </Card>
      ) : (
        <Card style={{ padding: 18 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            No activity yet.
          </Text>
        </Card>
      )}
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
  const { colors } = useTheme();
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
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: colors.textSubtle, fontSize: 11 }}>{label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700" }}>
          {percent}%
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${label} share of total balance`}
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        style={{
          height: 7,
          borderRadius: 4,
          backgroundColor: colors.surfaceSunken,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{ height: 7, width, borderRadius: 4, backgroundColor: tone }}
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
  const { colors } = useTheme();
  const incoming = item.amount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${formatMoney(item.amount, item.currency, { sign: true })}, ${formatDate(item.createdAt)}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderRadius: 12,
        backgroundColor: pressed ? colors.surfaceRaised : "transparent",
      })}
    >
      <TransactionIcon kind={item.kind} category={item.category} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}
        >
          {item.title}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: 12 }}>
          {formatDate(item.createdAt)}
          {item.status !== "completed" ? ` · ${item.status}` : ""}
        </Text>
      </View>
      <Text
        style={{
          color: incoming ? colors.accent : colors.text,
          fontSize: 14,
          fontWeight: "700",
        }}
      >
        {formatMoney(item.amount, item.currency, { sign: true })}
      </Text>
    </Pressable>
  );
}
