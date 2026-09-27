import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "@/src/api/client";
import {
  Card,
  Chip,
  ErrorState,
  HeaderBar,
  SectionHeader,
  Screen,
  Skeleton,
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

export default function InvestingScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
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
    <Screen onRefresh={reloadAll} refreshing={products.loading}>
      <HeaderBar title="Invest" />

      <Card style={{ padding: 18, marginBottom: 16 }}>
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
          Portfolio value
        </Text>
        {holdings.loading && !holdings.data ? (
          <View style={{ marginTop: 8 }}>
            <Skeleton height={30} width="55%" />
          </View>
        ) : (
          <Text
            style={{ color: colors.text, fontSize: 28, fontWeight: "800", marginTop: 2 }}
          >
            {formatMoney(current, portfolioCurrency)}
          </Text>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Ionicons
            name={gain >= 0 ? "arrow-up" : "arrow-down"}
            size={13}
            color={gain >= 0 ? colors.accent : colors.danger}
          />
          <Text
            style={{
              color: gain >= 0 ? colors.accent : colors.danger,
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            {formatMoney(gain, portfolioCurrency, { sign: true })} all time
          </Text>
        </View>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {FILTERS.map((option) => {
          const active = filter === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setFilter(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter ${option.label}`}
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

      {products.error ? (
        <ErrorState message={products.error} onRetry={reloadAll} />
      ) : null}

      <SectionHeader title={`${visible.length} products`} />

      {products.loading && !products.data ? (
        <Card style={{ padding: 16, gap: 14 }}>
          <Skeleton height={44} />
          <Skeleton height={44} width="80%" />
          <Skeleton height={44} width="90%" />
        </Card>
      ) : (
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
      )}
    </Screen>
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatMoney(product.price, product.currency)}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 13,
        marginBottom: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, fontSize: 14, fontWeight: "700", flexShrink: 1 }}
          >
            {product.name}
          </Text>
          <Chip label={product.risk} tone={RISK_TONE[product.risk]} />
        </View>
        <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: 12 }}>
          {product.ticker} · {product.provider} · {product.yieldPercent.toFixed(1)}% yield
        </Text>
      </View>

      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
          {formatMoney(product.price, product.currency)}
        </Text>
        <Text
          style={{
            color: up ? colors.accent : colors.danger,
            fontSize: 12,
            fontWeight: "700",
          }}
        >
          {formatPercent(percent)}
        </Text>
      </View>

      <Pressable
        onPress={onToggleWatch}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={watching ? "Remove from watchlist" : "Add to watchlist"}
        accessibilityState={{ selected: watching }}
      >
        <Ionicons
          name={watching ? "star" : "star-outline"}
          size={19}
          color={watching ? colors.accent : colors.textSubtle}
        />
      </Pressable>
    </Pressable>
  );
}
