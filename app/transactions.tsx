import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api/client";
import { TransactionIcon } from "@/src/components/marks";
import {
  Card,
  EmptyState,
  ErrorState,
  HeaderBar,
  SectionHeader,
  SegmentedFilter,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatDate, formatMoney, monthLabel } from "@/src/lib/format";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import { useTheme } from "@/src/theme/ThemeProvider";
import type {
  Transaction,
  TransactionCategory,
  TransactionKind,
} from "@/src/types";

type FilterKey = "all" | TransactionCategory | TransactionKind;

const FILTERS: { key: FilterKey; label: string }[] = [
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
  const { colors } = useTheme();
  const [filter, setFilter] = useState<FilterKey>("all");
  const { data, loading, error, reload, refreshing } = useApi(
    () => api.transactions.list(),
    [],
  );

  const sections = useMemo(() => {
    const filtered =
      filter === "all"
        ? (data ?? [])
        : (data ?? []).filter(
            (item) => item.category === filter || item.kind === filter,
          );

    const groups = new Map<string, Transaction[]>();
    for (const item of filtered) {
      const key = monthLabel(item.createdAt);
      const bucket = groups.get(key);
      if (bucket) bucket.push(item);
      else groups.set(key, [item]);
    }

    return Array.from(groups, ([title, rows]) => ({ title, data: rows }));
  }, [data, filter]);

  const totalIn = (data ?? [])
    .filter((item) => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0);
  const totalOut = (data ?? [])
    .filter((item) => item.amount < 0)
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);

  const currency = data?.[0]?.currency ?? DEFAULT_CURRENCY;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <HeaderBar title="Transactions" onBack={() => router.back()} />

        <Card style={styles.summary}>
          <View style={styles.summaryCell}>
            <Text style={{ color: colors.textSubtle, fontSize: 12 }}>Money in</Text>
            <Text style={{ color: colors.accent, fontSize: 18, fontWeight: "800" }}>
              {formatMoney(totalIn, currency, { compact: true, sign: true })}
            </Text>
          </View>
          <View style={[styles.summaryRule, { backgroundColor: colors.border }]} />
          <View style={styles.summaryCell}>
            <Text style={{ color: colors.textSubtle, fontSize: 12 }}>Money out</Text>
            <Text style={{ color: colors.danger, fontSize: 18, fontWeight: "800" }}>
              {formatMoney(totalOut, currency, { compact: true, sign: true })}
            </Text>
          </View>
        </Card>

        <SegmentedFilter
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {error ? (
        <View style={styles.body}>
          <ErrorState message={error} onRetry={reload} />
        </View>
      ) : loading && !data ? (
        <View style={styles.body}>
          <Card style={{ padding: 20, gap: 16 }}>
            <Skeleton height={44} />
            <Skeleton height={44} width="75%" />
            <Skeleton height={44} width="88%" />
          </Card>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={reload}
          refreshing={refreshing}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No transactions"
              message="Nothing matches this filter yet."
            />
          }
          renderSectionHeader={({ section }) => (
            <SectionHeader title={section.title} style={styles.sectionHeader} />
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
  const { colors, radii } = useTheme();
  const incoming = transaction.amount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${transaction.title}, ${formatMoney(transaction.amount, transaction.currency, { sign: true })}, ${formatDate(transaction.createdAt)}`}
      style={({ pressed }) => [
        styles.item,
        {
          borderRadius: radii.lg,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
        },
      ]}
    >
      <TransactionIcon
        kind={transaction.kind}
        category={transaction.category}
        amount={transaction.amount}
      />
      <View style={styles.itemBody}>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}
        >
          {transaction.title}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: 13 }}>
          {formatDate(transaction.createdAt)}
          {transaction.counterparty ? ` · ${transaction.counterparty}` : ""}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <Text
          style={{
            color: incoming ? colors.accent : colors.text,
            fontSize: 15,
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
            size={14}
            color={transaction.status === "pending" ? colors.warning : colors.danger}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    gap: 20,
    paddingBottom: 20,
  },
  body: {
    paddingHorizontal: 20,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 22,
  },
  summaryCell: {
    flex: 1,
    gap: 5,
  },
  summaryRule: {
    width: 1,
    alignSelf: "stretch",
    marginHorizontal: 18,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 26,
  },
  separator: {
    height: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderWidth: 1,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  itemRight: {
    alignItems: "flex-end",
    gap: 5,
  },
});
