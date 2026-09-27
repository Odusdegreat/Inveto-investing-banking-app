import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ApiError, api } from "@/src/api/client";
import {
  Banner,
  Button,
  Card,
  Chip,
  ErrorState,
  HeaderBar,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatMoney, formatPercent } from "@/src/lib/format";
import { confirmStepUp } from "@/src/lib/stepUp";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { InvestmentProduct } from "@/src/types";

const ASSET_LABEL: Record<InvestmentProduct["assetClass"], string> = {
  treasury: "Fixed income",
  equity: "Equity",
  etf: "ETF",
  crypto: "Digital assets",
  "fixed-deposit": "Fixed deposit",
};

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radii } = useTheme();

  const { data: product, loading, error, reload } = useApi(
    () => api.investing.product(String(id)),
    [id],
  );
  const holdings = useApi(() => api.investing.holdings(), []);

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [rawUnits, setRawUnits] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  if (loading && !product) {
    return (
      <Screen>
        <HeaderBar title="Product" onBack={() => router.back()} />
        <Card style={{ padding: 20, gap: 12 }}>
          <Skeleton height={18} width="40%" />
          <Skeleton height={34} />
          <Skeleton height={14} />
        </Card>
      </Screen>
    );
  }

  if (error || !product) {
    return (
      <Screen>
        <HeaderBar title="Product" onBack={() => router.back()} />
        <ErrorState message={error ?? "Product not found"} onRetry={reload} />
      </Screen>
    );
  }

  const change = product.price - product.previousClose;
  const changePercent = (change / product.previousClose) * 100;
  const up = change >= 0;

  const units = Number(rawUnits.replace(/[^0-9.]/g, "")) || 0;
  const gross = units * product.price;
  const fee = side === "buy" ? Math.max(gross * 0.0075, 1) : Math.max(gross * 0.005, 1);

  const owned = (holdings.data ?? []).find((h) => h.productId === product.id);
  const ownedUnits = owned?.units ?? 0;

  const canSubmit =
    units > 0 && (side === "buy" ? true : units <= ownedUnits) && !busy && !done;

  const submit = async () => {
    setFailure(null);

    const verb = side === "buy" ? "buy" : "sell";
    const stepUpToken = await confirmStepUp(
      `Confirm ${verb} ${units} ${product.ticker} for ${formatMoney(
        side === "buy" ? gross + fee : gross - fee,
        product.currency,
      )}.`,
    );
    if (!stepUpToken) {
      setFailure("Order cancelled. Your PIN is required to trade.");
      return;
    }

    setBusy(true);
    try {
      await api.investing.placeOrder({
        productId: product.id,
        side,
        units,
        price: product.price,
        fee,
        stepUpToken,
      });
      setDone(
        `${side === "buy" ? "Bought" : "Sold"} ${units} ${product.ticker} for ${formatMoney(gross, product.currency)}`,
      );
      setRawUnits("");
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen>
        <HeaderBar title="Order" onBack={() => router.back()} />
        <Card style={{ padding: 24, alignItems: "center", gap: 12 }}>
          <View style={[styles.tick, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="checkmark" size={28} color={colors.accent} />
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            {done}
          </Text>
          <Text
            style={{ color: colors.textSubtle, fontSize: 13, textAlign: "center" }}
          >
            Settles into your investment account within one business day.
          </Text>
          <Button
            label="Done"
            onPress={() => router.replace("/investing")}
            style={{ alignSelf: "stretch", marginTop: 8 }}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <HeaderBar title={product.ticker} onBack={() => router.back()} />

      <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: "800" }}>
          {formatMoney(product.price, product.currency)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons
            name={up ? "arrow-up" : "arrow-down"}
            size={14}
            color={up ? colors.accent : colors.danger}
          />
          <Text
            style={{
              color: up ? colors.accent : colors.danger,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            {formatPercent(change)} ({formatPercent(changePercent)})
          </Text>
        </View>
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
          Previous close {formatMoney(product.previousClose, product.currency)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Card style={{ flex: 1, padding: 14, gap: 4 }}>
          <Text style={{ color: colors.textSubtle, fontSize: 11 }}>Yield</Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
            {product.yieldPercent.toFixed(1)}%
          </Text>
        </Card>
        <Card style={{ flex: 1, padding: 14, gap: 4 }}>
          <Text style={{ color: colors.textSubtle, fontSize: 11 }}>You hold</Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
            {ownedUnits.toFixed(2)} {product.ticker}
          </Text>
        </Card>
      </View>

      <View style={{ height: 20 }} />

      <Card style={{ padding: 16, gap: 12 }}>
        <Row
          title={product.name}
          subtitle={`${ASSET_LABEL[product.assetClass]} · ${product.currency}`}
          left={<Chip label={product.ticker} tone="success" />}
        />
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
          {product.description ??
            "A regulated investment offered through INVETO. Prices move during market hours and returns are not guaranteed."}
        </Text>
      </Card>

      <View style={{ height: 20 }} />

      <View
        style={{
          flexDirection: "row",
          padding: 4,
          borderRadius: radii.md,
          backgroundColor: colors.surfaceSunken,
        }}
      >
        {(["buy", "sell"] as const).map((option) => {
          const active = side === option;
          return (
            <Pressable
              key={option}
              onPress={() => {
                setSide(option);
                setFailure(null);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option === "buy" ? "Buy" : "Sell"}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: radii.sm,
                backgroundColor: active ? colors.surface : "transparent",
              }}
            >
              <Text
                style={{
                  color: active
                    ? option === "buy"
                      ? colors.accent
                      : colors.danger
                    : colors.textSubtle,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {option === "buy" ? "Buy" : "Sell"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {failure ? (
        <View style={{ marginTop: 14 }}>
          <Banner tone="danger" message={failure} />
        </View>
      ) : null}

      {side === "sell" && ownedUnits === 0 ? (
        <View style={{ marginTop: 14 }}>
          <Banner
            tone="warning"
            message={`You do not hold any ${product.ticker} yet, so there is nothing to sell.`}
          />
        </View>
      ) : null}

      <View style={{ height: 14 }} />

      <Card style={{ padding: 18, gap: 12 }}>
        <SectionHeader title="Units" />
        <TextInput
          value={rawUnits}
          onChangeText={setRawUnits}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Number of units"
          style={{
            color: colors.text,
            fontSize: 26,
            fontWeight: "800",
            minHeight: 48,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
          }}
        />

        {units > 0 ? (
          <View style={{ gap: 6 }}>
            <Line
              label={`${side === "buy" ? "Cost" : "Proceeds"}`}
              value={formatMoney(gross, product.currency)}
            />
            <Line label="Fee" value={formatMoney(fee, product.currency)} />
            <Line
              label={side === "buy" ? "Total debit" : "Net credit"}
              value={formatMoney(
                side === "buy" ? gross + fee : gross - fee,
                product.currency,
              )}
              strong
            />
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 8 }}>
          {[1, 5, 10, 25].map((preset) => (
            <Pressable
              key={preset}
              onPress={() =>
                setRawUnits(
                  String(
                    side === "sell"
                      ? Math.min(preset, ownedUnits)
                      : preset,
                  ),
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`${preset} units`}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 8,
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700" }}>
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <View style={{ height: 18 }} />

      <Button
        label={side === "buy" ? "Place buy order" : "Place sell order"}
        size="lg"
        loading={busy}
        disabled={!canSubmit}
        onPress={submit}
      />

      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 11,
          textAlign: "center",
          lineHeight: 17,
          marginTop: 14,
        }}
      >
        Demo build — orders settle instantly against the seeded price and are
        stored locally.
      </Text>
    </Screen>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.line}>
      <Text
        style={{
          color: strong ? colors.text : colors.textSubtle,
          fontSize: 13,
          fontWeight: strong ? "700" : "400",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: strong ? colors.accent : colors.text,
          fontSize: 13,
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = {
  tick: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  line: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
};
