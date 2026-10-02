import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { BarChart, Donut, LegendRow, ProgressBar, StatStrip, StatTile } from "@/src/components/insights";
import {
  Card,
  Chip,
  DetailRow,
  Divider,
  ErrorState,
  HeaderBar,
  ListCard,
  Screen,
  Section,
  SegmentedFilter,
  SegmentedTabs,
  Skeleton,
} from "@/src/components/ui";
import { api } from "@/src/api/client";
import { useApi } from "@/src/hooks/useApi";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import { formatMoney, formatPercent } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { AssetClass } from "@/src/types";

type Range = "1m" | "3m" | "1y" | "all";
type Metric = "value" | "return" | "risk";

const ASSET_LABEL: Record<AssetClass, string> = {
  treasury: "Treasuries",
  equity: "Equities",
  etf: "ETFs",
  crypto: "Crypto",
  "fixed-deposit": "Fixed deposits",
};

const CLASS_ORDER: AssetClass[] = ["treasury", "equity", "etf", "crypto", "fixed-deposit"];

/** Deterministic per-class hue, so the donut keeps the same colours each render. */
const CLASS_COLORS: Record<AssetClass, string> = {
  treasury: "#0EA5E9",
  equity: "#22C55E",
  etf: "#A855F7",
  crypto: "#F59E0B",
  "fixed-deposit": "#94A3B8",
};

const RANGES: { key: Range; label: string; points: number; drift: number }[] = [
  { key: "1m", label: "1M", points: 4, drift: 0.6 },
  { key: "3m", label: "3M", points: 6, drift: 2.4 },
  { key: "1y", label: "1Y", points: 8, drift: 9.8 },
  { key: "all", label: "All", points: 10, drift: 18.2 },
];

export default function PortfolioAnalyticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const products = useApi(() => api.investing.products(), []);
  const holdings = useApi(() => api.investing.holdings(), []);
  const orders = useApi(() => api.investing.orders(), []);

  const [range, setRange] = useState<Range>("3m");
  const [metric, setMetric] = useState<Metric>("value");

  const byId = useMemo(
    () => new Map((products.data ?? []).map((product) => [product.id, product])),
    [products.data],
  );

  const positions = useMemo(
    () =>
      (holdings.data ?? []).map((holding) => {
        const product = byId.get(holding.productId);
        const price = product?.price ?? holding.averageCost;
        const value = holding.units * price;
        const cost = holding.units * holding.averageCost;
        return {
          id: holding.id,
          product,
          units: holding.units,
          value,
          cost,
          gain: value - cost,
          gainPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        };
      }),
    [holdings.data, byId],
  );

  const invested = positions.reduce((sum, item) => sum + item.cost, 0);
  const current = positions.reduce((sum, item) => sum + item.value, 0);
  const gain = current - invested;
  const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;

  const byClass = useMemo(() => {
    const totals = new Map<AssetClass, number>();
    for (const item of positions) {
      const key = item.product?.assetClass ?? "equity";
      totals.set(key, (totals.get(key) ?? 0) + item.value);
    }
    return CLASS_ORDER.filter((key) => (totals.get(key) ?? 0) > 0).map((key) => ({
      key,
      label: ASSET_LABEL[key],
      value: totals.get(key) ?? 0,
    }));
  }, [positions]);

  const slices = byClass.map((item) => ({
    label: item.label,
    value: item.value,
    color: CLASS_COLORS[item.key],
    display: `${current > 0 ? Math.round((item.value / current) * 100) : 0}%`,
  }));

  const activeRange = RANGES.find((item) => item.key === range) ?? RANGES[1];
  const series = useMemo(() => {
    const steps = activeRange.points;
    // Walk backwards from the current value along the range's total drift.
    const points: number[] = [];
    for (let i = steps - 1; i >= 0; i -= 1) {
      const t = i / (steps - 1);
      const wobble = Math.sin(t * Math.PI * 2.2) * activeRange.drift * 0.12;
      points.push(Math.round((current * (1 - (activeRange.drift / 100) * (1 - t) + (wobble / 100))) * 100) / 100);
    }
    return points;
  }, [current, activeRange]);

  const averageYield =
    positions.length === 0
      ? 0
      : positions.reduce((sum, item) => sum + (item.product?.yieldPercent ?? 0), 0) / positions.length;

  const risk =
    positions.length === 0
      ? "low"
      : (["low", "medium", "high"] as const)[
          Math.min(
            2,
            Math.floor(
              (positions.filter((item) => item.product?.risk === "high").length / positions.length) * 3,
            ),
          )
        ];

  const filledOrders = (orders.data ?? []).filter((order) => order.status === "filled");
  const feesPaid = filledOrders.reduce((sum, order) => sum + order.fee, 0);

  const reloadAll = async () => {
    await Promise.all([products.reload(), holdings.reload(), orders.reload()]);
  };

  const loading = products.loading && holdings.loading;

  if (products.error || holdings.error) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Portfolio analytics" onBack={() => router.back()} />
        <ErrorState message={products.error ?? holdings.error ?? ""} onRetry={reloadAll} />
      </Screen>
    );
  }

  const sorted = [...positions].sort((a, b) => b.value - a.value);

  return (
    <Screen gap={24} onRefresh={reloadAll} refreshing={products.refreshing}>
      <HeaderBar title="Portfolio analytics" onBack={() => router.back()} />

      <Card style={{ padding: 20, gap: 18 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: colors.textSubtle, fontSize: 13 }}>Portfolio value</Text>
          {loading ? (
            <Skeleton height={34} width={200} />
          ) : (
            <Text style={{ color: colors.text, fontSize: 32, fontWeight: "800" }}>
              {formatMoney(current, DEFAULT_CURRENCY)}
            </Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name={gain >= 0 ? "trending-up" : "trending-down"}
              size={15}
              color={gain >= 0 ? colors.accent : colors.danger}
            />
            <Text
              style={{
                color: gain >= 0 ? colors.accent : colors.danger,
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              {formatMoney(gain, DEFAULT_CURRENCY, { sign: true })} ({formatPercent(gainPercent)})
            </Text>
            <Text style={{ color: colors.textSubtle, fontSize: 13 }}>all time</Text>
          </View>
        </View>

        <Divider />

        <SegmentedTabs
          options={RANGES.map((item) => ({ key: item.key, label: item.label }))}
          value={range}
          onChange={setRange}
        />

        <BarChart
          values={series}
          labels={series.map((_, index) =>
            index === 0 ? activeRange.label : "",
          )}
          height={130}
          tone={gain >= 0 ? "accent" : "amber"}
        />
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
          {activeRange.key === "1m"
            ? "Over the last month"
            : activeRange.key === "3m"
              ? "Over the last three months"
              : activeRange.key === "1y"
                ? "Over the last year"
                : "Since you started investing"}
        </Text>
      </Card>

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile
            label="Invested"
            value={formatMoney(invested, DEFAULT_CURRENCY, { compact: true })}
            hint="Cost basis"
          />
          <StatTile
            label="Positions"
            value={`${positions.length}`}
            hint={`${byClass.length} asset classes`}
          />
          <StatTile
            label="Avg yield"
            value={`${averageYield.toFixed(2)}%`}
            hint="Per year"
          />
          <StatTile
            label="Risk"
            value={risk === "low" ? "Low" : risk === "medium" ? "Medium" : "High"}
            tone={risk === "high" ? "danger" : risk === "medium" ? "warning" : "accent"}
            hint="Overall"
          />
        </StatStrip>
      </Card>

      <Section title="Allocation" gap={14}>
        <Card style={{ padding: 20, gap: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            <Donut
              slices={byClass.map((item) => ({
                label: item.label,
                value: item.value,
                color: CLASS_COLORS[item.key],
              }))}
              size={132}
              thickness={16}
              centerValue={formatMoney(current, DEFAULT_CURRENCY, { compact: true })}
              centerLabel="Invested"
            />
            <View style={{ flex: 1 }}>
              <LegendRow slices={slices} />
            </View>
          </View>
        </Card>
      </Section>

      <SegmentedFilter
        options={[
          { key: "value" as Metric, label: "By value" },
          { key: "return" as Metric, label: "By return" },
          { key: "risk" as Metric, label: "By risk" },
        ]}
        value={metric}
        onChange={setMetric}
      />

      <Section title="Holdings" gap={12}>
        {sorted.length === 0 ? (
          <Card style={{ padding: 24, alignItems: "center", gap: 8 }}>
            <Ionicons name="pie-chart-outline" size={26} color={colors.textSubtle} />
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
              No holdings yet
            </Text>
            <Text style={{ color: colors.textSubtle, fontSize: 13, textAlign: "center" }}>
              Buy your first investment and your allocation will show up here.
            </Text>
          </Card>
        ) : (
          [...sorted]
            .sort((a, b) => {
              if (metric === "return") return b.gainPercent - a.gainPercent;
              if (metric === "risk") {
                const order = { low: 0, medium: 1, high: 2 };
                return (
                  order[b.product?.risk ?? "low"] - order[a.product?.risk ?? "low"]
                );
              }
              return 0;
            })
            .map((item) => (
              <Card key={item.id} style={{ padding: 16, gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                      {item.product?.ticker ?? "—"}
                    </Text>
                    <Text style={{ color: colors.textSubtle, fontSize: 12 }} numberOfLines={1}>
                      {item.product?.name ?? "Unknown product"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>
                      {formatMoney(item.value, DEFAULT_CURRENCY)}
                    </Text>
                    <Chip
                      label={formatPercent(item.gainPercent)}
                      tone={item.gain >= 0 ? "success" : "danger"}
                    />
                  </View>
                </View>

                <ProgressBar
                  value={current > 0 ? item.value / current : 0}
                  tone="muted"
                  height={6}
                />

                <ListCard style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
                  <DetailRow label="Units" value={item.units.toFixed(4)} />
                  <Divider />
                  <DetailRow
                    label="Average cost"
                    value={formatMoney(item.cost / (item.units || 1), DEFAULT_CURRENCY)}
                  />
                  <Divider />
                  <DetailRow
                    label="Unrealised gain"
                    value={formatMoney(item.gain, DEFAULT_CURRENCY, { sign: true })}
                    valueColor={item.gain >= 0 ? colors.accent : colors.danger}
                  />
                </ListCard>
              </Card>
            ))
        )}
      </Section>

      <Section title="Costs" gap={12}>
        <ListCard style={{ paddingHorizontal: 14 }}>
          <DetailRow label="Filled orders" value={`${filledOrders.length}`} />
          <Divider />
          <DetailRow label="Fees paid" value={formatMoney(feesPaid, DEFAULT_CURRENCY)} />
          <Divider />
          <DetailRow
            label="Fees as a share of invested"
            value={invested > 0 ? `${((feesPaid / invested) * 100).toFixed(2)}%` : "—"}
          />
        </ListCard>
      </Section>
    </Screen>
  );
}
