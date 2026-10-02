import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/src/api/client";
import {
  Card,
  Chip,
  Divider,
  ErrorState,
  HeaderAction,
  HeaderBar,
  IconBadge,
  Screen,
  Section,
  SegmentedFilter,
  Skeleton,
  Stack,
  Tile,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatMoney, formatPercent } from "@/src/lib/format";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { AssetClass, InvestmentProduct } from "@/src/types";

const FILTERS: { key: "all" | AssetClass; label: string }[] = [
  { key: "all", label: "All" },
  { key: "treasury", label: "Treasury" },
  { key: "etf", label: "ETFs" },
  { key: "equity", label: "Equity" },
  { key: "fixed-deposit", label: "Deposits" },
  { key: "crypto", label: "Crypto" },
];

const RISK_TONE = {
  low: "success",
  medium: "warning",
  high: "danger",
} as const;

const ASSET_ICON: Record<AssetClass, React.ComponentProps<typeof Ionicons>["name"]> = {
  treasury: "business-outline",
  equity: "stats-chart-outline",
  etf: "layers-outline",
  crypto: "flash-outline",
  "fixed-deposit": "calendar-outline",
};

export default function InvestingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<"all" | AssetClass>("all");

  const products = useApi(() => api.investing.products(), []);
  const holdings = useApi(() => api.investing.holdings(), []);
  const watchlist = useApi(() => api.investing.watchlist(), []);

  const byId = new Map(
    (products.data ?? []).map((product) => [product.id, product]),
  );

  const invested = (holdings.data ?? []).reduce(
    (sum, holding) => sum + holding.units * holding.averageCost,
    0,
  );
  const current = (holdings.data ?? []).reduce((sum, holding) => {
    const product = byId.get(holding.productId);
    return sum + holding.units * (product?.price ?? holding.averageCost);
  }, 0);
  const gain = current - invested;
  const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;
  const positions = holdings.data?.length ?? 0;

  const portfolioCurrency = DEFAULT_CURRENCY;

  const visible = (products.data ?? []).filter(
    (product) => filter === "all" || product.assetClass === filter,
  );

  const reloadAll = async () => {
    await Promise.all([products.reload(), holdings.reload(), watchlist.reload()]);
  };

  const toggleWatch = async (productId: string) => {
    await api.investing.toggleWatchlist(productId);
  };

  return (
    <Screen gap={22} onRefresh={reloadAll} refreshing={products.loading}>
      <HeaderBar
        title="Invest"
        right={
          <HeaderAction
            label="Orders"
            onPress={() => router.push("/investment-orders")}
          />
        }
      />

      <Card style={styles.summary}>
        <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
          Portfolio value
        </Text>
        {holdings.loading && !holdings.data ? (
          <Skeleton height={34} width="55%" />
        ) : (
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: "800" }}>
            {formatMoney(current, portfolioCurrency)}
          </Text>
        )}

        <View style={styles.gainRow}>
          <View
            style={[
              styles.gainPill,
              {
                borderRadius: 9999,
                backgroundColor: gain >= 0 ? colors.accentSoft : colors.dangerSoft,
              },
            ]}
          >
            <Ionicons
              name={gain >= 0 ? "trending-up" : "trending-down"}
              size={14}
              color={gain >= 0 ? colors.accent : colors.danger}
            />
            <Text
              style={{
                color: gain >= 0 ? colors.accent : colors.danger,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {formatMoney(gain, portfolioCurrency, { sign: true })}
            </Text>
          </View>
          <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
            {formatPercent(gainPercent)} all time
          </Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.metaRow}>
          <Meta label="Positions" value={String(positions)} />
          <Meta
            label="Cost basis"
            value={formatMoney(invested, portfolioCurrency, { compact: true })}
          />
          <Meta
            label="Watching"
            value={String(watchlist.data?.length ?? 0)}
          />
        </View>
      </Card>

      <SegmentedFilter
        options={FILTERS}
        value={filter}
        onChange={setFilter}
      />

      {products.error ? (
        <ErrorState message={products.error} onRetry={reloadAll} />
      ) : null}

      <Section title={`${visible.length} product${visible.length === 1 ? "" : "s"}`} gap={12}>
        {products.loading && !products.data ? (
          <Stack gap={12}>
            <Card style={{ padding: 20, gap: 18 }}>
              <Skeleton height={44} />
              <Skeleton height={44} width="80%" />
              <Skeleton height={44} width="90%" />
            </Card>
          </Stack>
        ) : visible.length ? (
          visible.map((product) => (
            <Product
              key={product.id}
              product={product}
              watching={Boolean(
                watchlist.data?.some((item) => item.productId === product.id),
              )}
              onToggleWatch={() => void toggleWatch(product.id)}
              onPress={() => router.push(`/invest/${product.id}` as never)}
            />
          ))
        ) : (
          <Card style={{ padding: 20 }}>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
              Nothing in this category right now. Try another filter to see what is
              available.
            </Text>
          </Card>
        )}
      </Section>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.meta}>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
        {value}
      </Text>
      <Text style={{ color: colors.textSubtle, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function Product({
  product,
  watching,
  onToggleWatch,
  onPress,
}: {
  product: InvestmentProduct;
  watching: boolean;
  onToggleWatch: () => void;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const change = product.price - product.previousClose;
  const percent = (change / product.previousClose) * 100;
  const up = change >= 0;

  return (
    <Tile
      onPress={onPress}
      accessibilityLabel={`${product.name}, ${formatMoney(product.price, product.currency)}`}
      style={styles.product}
    >
      <IconBadge icon={ASSET_ICON[product.assetClass]} tone="neutral" />

      <View style={styles.productBody}>
        <View style={styles.productHead}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, fontSize: 15, fontWeight: "700", flexShrink: 1 }}
          >
            {product.name}
          </Text>
          <Chip label={product.risk} tone={RISK_TONE[product.risk]} />
        </View>
        <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: 13 }}>
          {product.ticker} · {product.provider}
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
          {product.yieldPercent.toFixed(1)}% yield
        </Text>
      </View>

      <View style={styles.productRight}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
          {formatMoney(product.price, product.currency)}
        </Text>
        <Text
          style={{
            color: up ? colors.accent : colors.danger,
            fontSize: 13,
            fontWeight: "700",
          }}
        >
          {formatPercent(percent)}
        </Text>
        <Pressable
          onPress={onToggleWatch}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={watching ? "Remove from watchlist" : "Add to watchlist"}
          accessibilityState={{ selected: watching }}
          style={({ pressed }) => [styles.watchButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons
            name={watching ? "star" : "star-outline"}
            size={20}
            color={watching ? colors.accent : colors.textSubtle}
          />
        </Pressable>
      </View>
    </Tile>
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: 20,
    gap: 6,
  },
  gainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  gainPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaRow: {
    flexDirection: "row",
  },
  meta: {
    flex: 1,
    gap: 3,
  },
  product: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  productBody: {
    flex: 1,
    gap: 4,
  },
  productHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  watchButton: {
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 16,
  },
});
