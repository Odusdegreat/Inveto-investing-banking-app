import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { api } from "@/src/api/client";
import { Card, EmptyState, Screen, SectionHeader, Skeleton } from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import {
  CATEGORY_LABEL,
  formatMoney,
  formatRelative,
  maskAccountNumber,
} from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Transaction } from "@/src/types";

const DAY = 86_400_000;
const CHART_HEIGHT = 132;

type TabKey = "assets" | "spending" | "income";

const TABS: { key: TabKey; label: string }[] = [
  { key: "assets", label: "Assets" },
  { key: "spending", label: "Spending" },
  { key: "income", label: "Income" },
];

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default function DashboardScreen() {
  const { colors, radii } = useTheme();
  const [tab, setTab] = useState<TabKey>("assets");
  const [chartWidth, setChartWidth] = useState(0);
  /**
   * Frozen at mount so the 7-day window does not shift underneath a re-render.
   * `onRefresh` bumps it so a long-lived session rolls to the new day.
   */
  const [today, setToday] = useState(() => startOfDay(Date.now()));

  const accounts = useApi(() => api.accounts.list(), []);
  const transactions = useApi(() => api.transactions.list(), []);
  const holdings = useApi(() => api.investing.holdings(), []);
  const products = useApi(() => api.investing.products(), []);

  const currency = accounts.data?.[0]?.currency ?? DEFAULT_CURRENCY;

  const portfolioValue = useMemo(() => {
    const prices = new Map(
      (products.data ?? []).map((product) => [product.id, product.price]),
    );
    return (holdings.data ?? []).reduce(
      (sum, holding) =>
        sum + holding.units * (prices.get(holding.productId) ?? holding.averageCost),
      0,
    );
  }, [holdings.data, products.data]);

  const cashTotal = (accounts.data ?? []).reduce(
    (sum, account) => sum + account.balance,
    0,
  );
  const netWorth = cashTotal + portfolioValue;

  /**
   * One consistent series: net flow per day across the last 7 days. The chart
   * does not change meaning when the tab changes, so switching tabs never
   * redraws the axis under different semantics.
   */
  const week = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const start = today - (6 - index) * DAY;
      return {
        start,
        label: new Date(start).toLocaleDateString("en-GB", { weekday: "narrow" }),
        full: new Date(start).toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        inflow: 0,
        outflow: 0,
      };
    });

    for (const item of transactions.data ?? []) {
      if (item.status === "reversed" || item.status === "failed") continue;
      const day = startOfDay(new Date(item.createdAt).getTime());
      const bucket = buckets.find((candidate) => candidate.start === day);
      if (!bucket) continue;
      if (item.amount >= 0) bucket.inflow += item.amount;
      else bucket.outflow += Math.abs(item.amount);
    }

    return buckets.map((bucket) => ({ ...bucket, net: bucket.inflow - bucket.outflow }));
  }, [transactions.data, today]);

  const weekIn = week.reduce((sum, day) => sum + day.inflow, 0);
  const weekOut = week.reduce((sum, day) => sum + day.outflow, 0);
  const weekNet = weekIn - weekOut;

  const monthStart = useMemo(() => {
    const date = new Date(today);
    return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  }, [today]);

  const month = useMemo(() => {
    const rows = (transactions.data ?? []).filter(
      (item) =>
        item.status !== "reversed" &&
        item.status !== "failed" &&
        new Date(item.createdAt).getTime() >= monthStart,
    );
    const inflow = rows
      .filter((item) => item.amount > 0)
      .reduce((sum, item) => sum + item.amount, 0);
    const outflow = rows
      .filter((item) => item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    const byCategory = new Map<string, number>();
    for (const item of rows) {
      if (item.amount >= 0) continue;
      const key = item.category;
      byCategory.set(key, (byCategory.get(key) ?? 0) + Math.abs(item.amount));
    }

    return { inflow, outflow, net: inflow - outflow, top: [...byCategory.entries()] };
  }, [transactions.data, monthStart]);

  const monthLabel = useMemo(
    () =>
      new Date(today).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    [today],
  );

  const headline =
    tab === "assets" ? netWorth : tab === "spending" ? weekOut : weekIn;

  const chart = useMemo(() => {
    if (chartWidth <= 0 || week.length === 0) return null;

    const values = week.map((day) => day.net);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin || Math.max(Math.abs(rawMax), 1);
    const pad = span * 0.25;
    const min = rawMin - pad;
    const max = rawMax + pad;

    const usable = CHART_HEIGHT - 16;
    const points = week.map((day, index) => {
      const x =
        week.length === 1
          ? chartWidth / 2
          : (index / (week.length - 1)) * chartWidth;
      const y = 8 + (1 - (day.net - min) / (max - min)) * usable;
      return { x, y };
    });

    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");
    const baseline = CHART_HEIGHT - 8;
    const area = `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;

    return { points, line, area, min: rawMin, max: rawMax, baseline };
  }, [chartWidth, week]);

  const onChartLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  const listFor = (): { label: string; sub: string; value: number }[] => {
    if (tab === "assets") {
      return [
        ...(accounts.data ?? []).map((account) => ({
          label: account.name,
          sub: `${maskAccountNumber(account.number)} · ${account.kind}`,
          value: account.balance,
        })),
        {
          label: "Investment portfolio",
          sub: `${holdings.data?.length ?? 0} holding${holdings.data?.length === 1 ? "" : "s"} at market value`,
          value: portfolioValue,
        },
      ];
    }

    const sign = tab === "spending" ? -1 : 1;
    return (transactions.data ?? [])
      .filter(
        (item) =>
          item.status !== "reversed" &&
          item.status !== "failed" &&
          Math.sign(item.amount) === sign,
      )
      .slice(0, 6)
      .map((item: Transaction) => ({
        label: item.title,
        sub: `${CATEGORY_LABEL[item.category]} · ${formatRelative(item.createdAt)}`,
        value: Math.abs(item.amount),
      }));
  };

  const rows = listFor();
  const loading = accounts.loading || transactions.loading;

  return (
    <Screen
      refreshing={accounts.refreshing || transactions.refreshing}
      onRefresh={() => {
        setToday(startOfDay(Date.now()));
        void accounts.reload();
        void transactions.reload();
        void holdings.reload();
        void products.reload();
      }}
    >
      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {monthLabel}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 13,
          marginTop: 2,
        }}
      >
        Overview
      </Text>

      <View style={{ height: 18 }} />

      <Card style={{ padding: 18 }}>
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
          {tab === "assets" ? "Total net worth" : tab === "spending" ? "Spent this week" : "Received this week"}
        </Text>
        {loading ? (
          <Skeleton height={30} width="60%" />
        ) : (
          <Text
            style={{
              color: colors.text,
              fontSize: 32,
              fontWeight: "800",
              marginTop: 4,
            }}
          >
            {formatMoney(headline, currency)}
          </Text>
        )}

        {tab === "assets" ? (
          <View style={{ flexDirection: "row", gap: 20, marginTop: 12 }}>
            <View>
              <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Cash</Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                {formatMoney(cashTotal, currency, { compact: true })}
              </Text>
            </View>
            <View>
              <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Invested</Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                {formatMoney(portfolioValue, currency, { compact: true })}
              </Text>
            </View>
          </View>
        ) : null}
      </Card>

      <View style={{ height: 16 }} />

      <View style={{ flexDirection: "row", gap: 8 }}>
        {TABS.map((option) => {
          const active = tab === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setTab(option.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${option.label} view`}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: active ? colors.accent : colors.border,
                backgroundColor: active ? colors.accentSoft : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? colors.accent : colors.textMuted,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 20 }} />

      <SectionHeader title="Last 7 days" />
      <Card style={{ padding: 16 }}>
        <View style={{ height: CHART_HEIGHT }} onLayout={onChartLayout}>
          {chart ? (
            <Svg height={CHART_HEIGHT} width={chartWidth}>
              <Line
                x1={0}
                y1={chart.baseline}
                x2={chartWidth}
                y2={chart.baseline}
                stroke={colors.border}
                strokeWidth={1}
              />
              <Path d={chart.area} fill={colors.accentSoft} />
              <Path
                d={chart.line}
                stroke={colors.accent}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {chart.points.map((point, index) => (
                <Circle
                  key={week[index].start}
                  cx={point.x}
                  cy={point.y}
                  r={3.5}
                  fill={colors.accent}
                />
              ))}
            </Svg>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
          {week.map((day) => (
            <Text
              key={day.start}
              style={{ color: colors.textSubtle, fontSize: 11, fontWeight: "600" }}
            >
              {day.label}
            </Text>
          ))}
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <View>
            <Text style={{ color: colors.textSubtle, fontSize: 11 }}>In</Text>
            <Text style={{ color: colors.success, fontSize: 15, fontWeight: "700" }}>
              {formatMoney(weekIn, currency, { compact: true })}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Out</Text>
            <Text style={{ color: colors.danger, fontSize: 15, fontWeight: "700" }}>
              {formatMoney(weekOut, currency, { compact: true })}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Net</Text>
            <Text
              style={{
                color: weekNet >= 0 ? colors.success : colors.danger,
                fontSize: 15,
                fontWeight: "700",
              }}
            >
              {formatMoney(weekNet, currency, { compact: true, sign: true })}
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ height: 20 }} />

      <SectionHeader
        title={tab === "assets" ? "Holdings" : tab === "spending" ? "Recent spending" : "Recent income"}
      />
      {loading ? (
        <Card style={{ padding: 16, gap: 12 }}>
          <Skeleton height={18} />
          <Skeleton height={18} />
          <Skeleton height={18} />
        </Card>
      ) : rows.length === 0 ? (
        <Card style={{ padding: 16 }}>
          <EmptyState
            icon={tab === "assets" ? "wallet-outline" : "receipt-outline"}
            title={
              tab === "assets"
                ? "No accounts yet"
                : tab === "spending"
                  ? "Nothing spent yet"
                  : "No income yet"
            }
            message={
              tab === "assets"
                ? "Open an account to start tracking your money here."
                : "Transactions in this category will show up here."
            }
          />
        </Card>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {rows.map((row, index) => (
            <View key={`${row.label}-${index}`}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 13,
                  paddingHorizontal: 14,
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                    {row.label}
                  </Text>
                  <Text style={{ color: colors.textSubtle, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                    {row.sub}
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "700",
                  }}
                >
                  {tab === "spending"
                    ? formatMoney(-row.value, currency)
                    : formatMoney(row.value, currency)}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <View style={{ height: 20 }} />

      <SectionHeader title={`This month`} />
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSubtle, fontSize: 11 }}>In</Text>
            <Text style={{ color: colors.success, fontSize: 16, fontWeight: "800", marginTop: 2 }}>
              {formatMoney(month.inflow, currency, { compact: true })}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Out</Text>
            <Text style={{ color: colors.danger, fontSize: 16, fontWeight: "800", marginTop: 2 }}>
              {formatMoney(month.outflow, currency, { compact: true })}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Net</Text>
            <Text
              style={{
                color: month.net >= 0 ? colors.success : colors.danger,
                fontSize: 16,
                fontWeight: "800",
                marginTop: 2,
              }}
            >
              {formatMoney(month.net, currency, { compact: true, sign: true })}
            </Text>
          </View>
        </View>

        {month.top.length > 0 ? (
          <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text style={{ color: colors.textSubtle, fontSize: 11, marginBottom: 10 }}>
              Top spending categories
            </Text>
            {month.top
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([category, value]) => {
                const share = month.outflow > 0 ? value / month.outflow : 0;
                return (
                  <View key={category} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>
                        {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                        {formatMoney(value, currency, { compact: true })}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: colors.surfaceSunken,
                        marginTop: 6,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.max(share * 100, 2)}%`,
                          height: "100%",
                          backgroundColor: colors.accent,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
          </View>
        ) : null}
      </Card>

      <View style={{ height: 12 }} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" }}>
        <Ionicons name="information-circle-outline" size={13} color={colors.textSubtle} />
        <Text style={{ color: colors.textSubtle, fontSize: 11 }}>
          Figures exclude reversed and failed transactions.
        </Text>
      </View>
    </Screen>
  );
}
