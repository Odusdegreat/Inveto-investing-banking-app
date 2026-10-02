import { toast } from "@/src/components/Toast";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
  Stack,
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

  const [retrying, setRetrying] = useState(false);
  const pending = useRef<{ body: Parameters<typeof api.investing.placeOrder>[0]; key: string } | null>(null);

  if (loading && !product) {
    return (
      <Screen gap={22}>
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
      <Screen gap={22}>
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
    if (busy) return;
    setFailure(null);
    setBusy(true);
    try {
      if (!pending.current) {
        const quote = await api.investing.quote(product.id, side, units);
        if (![quote.price, quote.fee].every(Number.isFinite)) throw new ApiError("invalid_response", "The server did not return a valid order quote.");
        const stepUpToken = await confirmStepUp("investment_order", `Confirm ${side} ${units} ${product.ticker} at ${formatMoney(quote.price, product.currency)} per unit, with a fee of ${formatMoney(quote.fee, product.currency)}.`);
        if (!stepUpToken) return;
        pending.current = { body: { productId: product.id, side, units, price: quote.price, fee: quote.fee, stepUpToken }, key: `order-${Date.now()}-${Math.random().toString(36).slice(2)}` };
      }
      const order = await api.investing.placeOrder(pending.current.body, pending.current.key);
      pending.current = null;
      toast.success("Order submitted.");
      setDone(`Order ${order.status}: ${order.units} units for ${formatMoney(order.total, product.currency)}`);
      setRawUnits("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Order failed.");
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && ![408, 409, 429].includes(err.status)) pending.current = null;
      setFailure(pending.current ? "The order outcome is uncertain. Retry the original order here before starting another." : err instanceof ApiError ? err.message : "Order failed");
    } finally {
      setRetrying(pending.current !== null);
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen gap={22}>
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
    <Screen gap={22}>
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
        <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
          Previous close {formatMoney(product.previousClose, product.currency)}
        </Text>
      </View>

      <View style={styles.statRow}>
        <Card style={styles.stat}>
          <Text style={{ color: colors.textSubtle, fontSize: 12 }}>Yield</Text>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
            {product.yieldPercent.toFixed(1)}%
          </Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={{ color: colors.textSubtle, fontSize: 12 }}>You hold</Text>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
            {ownedUnits.toFixed(2)} {product.ticker}
          </Text>
        </Card>
      </View>

      <Card style={{ padding: 18, gap: 14 }}>
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

      <View
        style={[
          styles.sideSwitch,
          { borderRadius: radii.md, backgroundColor: colors.surfaceSunken },
        ]}
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
              style={[
                styles.sideOption,
                {
                  borderRadius: radii.sm,
                  backgroundColor: active ? colors.surface : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  color: active
                    ? option === "buy"
                      ? colors.accent
                      : colors.danger
                    : colors.textSubtle,
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                {option === "buy" ? "Buy" : "Sell"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {failure ? <Banner tone="danger" message={failure} /> : null}

      {side === "sell" && ownedUnits === 0 ? (
        <Banner
          tone="warning"
          message={`You do not hold any ${product.ticker} yet, so there is nothing to sell.`}
        />
      ) : null}

      <Card style={{ padding: 20, gap: 16 }}>
        <SectionHeader title="Units" />
        <TextInput
          value={rawUnits}
          onChangeText={setRawUnits}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Number of units"
          style={[
            styles.unitsInput,
            {
              borderRadius: radii.md,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
        />

        {units > 0 ? (
          <Stack gap={10}>
            <Line
              label={`${side === "buy" ? "Cost" : "Proceeds"}`}
              value={formatMoney(gross, product.currency)}
            />
            <Line label="Estimated fee" value={formatMoney(fee, product.currency)} />
            <Line
              label={side === "buy" ? "Total debit" : "Net credit"}
              value={formatMoney(
                side === "buy" ? gross + fee : gross - fee,
                product.currency,
              )}
              strong
            />
          </Stack>
        ) : null}

        <View style={styles.presets}>
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
              style={({ pressed }) => [
                styles.preset,
                {
                  borderRadius: radii.md,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceRaised : "transparent",
                },
              ]}
            >
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "700" }}>
                {preset}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Button
        label={retrying ? "Retry original order" : side === "buy" ? "Place buy order" : "Place sell order"}
        size="lg"
        loading={busy}
        disabled={retrying ? busy : !canSubmit}
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
        Final prices and fees are confirmed before you submit.
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
  statRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  stat: {
    flex: 1,
    padding: 18,
    gap: 5,
  },
  sideSwitch: {
    flexDirection: "row" as const,
    padding: 5,
  },
  sideOption: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 13,
  },
  unitsInput: {
    fontSize: 26,
    fontWeight: "800" as const,
    minHeight: 60,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  presets: {
    flexDirection: "row" as const,
    gap: 10,
  },
  preset: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 13,
    borderWidth: 1,
  },
  line: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
};
