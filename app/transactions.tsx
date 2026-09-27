import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, SectionList, Text, View } from "react-native";

import { api } from "@/src/api/client";
import { TransactionIcon } from "@/src/components/marks";
import {
  Card,
  EmptyState,
  ErrorState,
  HeaderBar,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatDate, formatMoney, monthLabel } from "@/src/lib/format";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Transaction, TransactionCategory, TransactionKind } from "@/src/types";

const FILTERS: { key: "all" | TransactionCategory | TransactionKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "transfer", label: "Transfers" },
  { key: "card", label: "Card" },
  { key: "salary", label: "Income" },
  { key: "food", label: "Food" },
  { key: "shopping", label: "Shopping" },
  { key: "transport", label: "Transport" },
  { key: "utilities", label: "Bills" },
];

export default function Transactions() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const [filter, setFilter] = useState<"all" | TransactionCategory | TransactionKind>(
    "all",
  );
  const { data, loading, error, reload, refreshing } = useApi(
    () => api.transactions.list(),
    [],
  );

  const sections = useMemo(() => {
    const filtered =
      filter === "all"
        ? (data ?? [])
        : (data ?? []).filter(
            (item) =>
              item.category === filter || item.kind === filter,
          );

    const groups = new Map<string, Transaction[]>();
    for (const item of filtered) {
      const key = monthLabel(item.createdAt);
      const bucket = groups.get(key);
      if (bucket) bucket.push(item);
      else groups.set(key, [item]);
    }

    return Array.from(groups, ([title, data_]) => ({ title, data: data_ }));
  }, [data, filter]);

  const totalIn = (data ?? [])
    .filter((item) => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);
  const totalOut = (data ?? [])
    .filter((item) => item.amount < 0)
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);

  const currency = data?.[0]?.currency ?? DEFAULT_CURRENCY;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: 48, paddingHorizontal: 20 }}>
        <HeaderBar title="Transactions" onBack={() => router.back()} />

        <Card style={{ padding: 16, flexDirection: "row", marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Money in</Text>
            <Text
              style={{ color: colors.accent, fontSize: 17, fontWeight: "800" }}
            >
              {formatMoney(totalIn, currency, { compact: true, sign: true })}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Money out</Text>
            <Text style={{ color: colors.danger, fontSize: 17, fontWeight: "800" }}>
              {formatMoney(totalOut, currency, { compact: true, sign: true })}
            </Text>
          </View>
        </Card>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {FILTERS.map((option) => {
            const active = filter === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setFilter(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter by ${option.label}`}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentSoft : "transparent",
                }}
              >
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
      </View>

      {error ? (
        <View style={{ paddingHorizontal: 20 }}>
          <ErrorState message={error} onRetry={reload} />
        </View>
      ) : loading && !data ? (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Card style={{ padding: 16, gap: 12 }}>
            <Skeleton height={40} />
            <Skeleton height={40} width="75%" />
            <Skeleton height={40} width="88%" />
          </Card>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          onRefresh={reload}
          refreshing={refreshing}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No transactions"
              message="Nothing matches this filter yet."
            />
          }
          renderSectionHeader={({ section }) => (
            <Text
              style={{
                color: colors.textSubtle,
                fontSize: 12,
                fontWeight: "700",
                marginTop: 14,
                marginBottom: 8,
              }}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Item
              transaction={item}
              onPress={() => router.push(`/transaction/${item.id}` as never)}
            />
          )}
        />
      )}
    </View>
  );
}

function Item({
  transaction,
  onPress,
}: {
  transaction: Transaction;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const incoming = transaction.amount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${transaction.title}, ${formatMoney(transaction.amount, transaction.currency, { sign: true })}, ${formatDate(transaction.createdAt)}`}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 12,
          paddingVertical: 11,
          marginBottom: 8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
        },
      ]}
    >
      <TransactionIcon
        kind={transaction.kind}
        category={transaction.category}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}
        >
          {transaction.title}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: 12 }}>
          {formatDate(transaction.createdAt)}
          {transaction.counterparty ? ` · ${transaction.counterparty}` : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Text
          style={{
            color: incoming ? colors.accent : colors.text,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {formatMoney(transaction.amount, transaction.currency, { sign: true })}
        </Text>
        {transaction.status !== "completed" ? (
          <Ionicons
            name={
              transaction.status === "pending"
                ? "time-outline"
                : "close-circle-outline"
            }
            size={13}
            color={transaction.status === "pending" ? colors.warning : colors.danger}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
