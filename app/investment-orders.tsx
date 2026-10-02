import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet } from "react-native";

import { api } from "@/src/api/client";
import {
  Button,
  Card,
  Chip,
  DetailRow,
  EmptyState,
  ErrorState,
  HeaderBar,
  ListCard,
  Row,
  Screen,
  Section,
  Skeleton,
  Stack,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatDate, formatMoney } from "@/src/lib/format";
import { singleParam } from "@/src/lib/links";

export default function InvestmentOrders() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const [selected, setSelected] = useState(singleParam(params.id));

  const orders = useApi(() => api.investing.orders(), []);
  const products = useApi(() => api.investing.products(), []);
  const detail = useApi(() =>
    selected ? api.investing.order(selected) : Promise.resolve(null),
  [selected]);

  const currency = products.data?.find(
    (item) => item.id === detail.data?.productId,
  )?.currency;

  const money = (value: number) =>
    currency ? formatMoney(value, currency) : String(value);

  return (
    <Screen gap={24} onRefresh={orders.refresh} refreshing={orders.refreshing}>
      <HeaderBar title="Investment orders" onBack={() => router.back()} />

      {orders.error ? (
        <ErrorState message={orders.error} onRetry={orders.reload} />
      ) : null}

      {selected ? (
        <Section title="Order details" gap={14}>
          <Card style={styles.detailCard}>
            {detail.error ? (
              <ErrorState message={detail.error} onRetry={detail.reload} />
            ) : detail.loading ? (
              <Stack gap={12}>
                <Skeleton height={24} width="30%" />
                <Skeleton height={18} />
                <Skeleton height={18} width="70%" />
              </Stack>
            ) : detail.data ? (
              <Stack gap={4}>
                <Chip
                  label={detail.data.status}
                  tone={detail.data.status === "filled" ? "success" : "warning"}
                />
                <DetailRow
                  label="Side"
                  value={detail.data.side === "buy" ? "Buy" : "Sell"}
                />
                <DetailRow label="Units" value={String(detail.data.units)} />
                <DetailRow label="Unit price" value={money(detail.data.price)} />
                <DetailRow label="Order value" value={money(detail.data.total)} />
                <DetailRow label="Fee" value={money(detail.data.fee)} />
                <DetailRow label="Placed" value={formatDate(detail.data.createdAt)} />
                <DetailRow
                  label="Order ID"
                  value={detail.data.id}
                  selectable
                  wide
                />
                <Button
                  label="View investment"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: "/invest/[id]",
                      params: { id: detail.data!.productId },
                    })
                  }
                />
              </Stack>
            ) : null}

            <Button
              label="Close details"
              variant="ghost"
              onPress={() => setSelected("")}
            />
          </Card>
        </Section>
      ) : null}

      <Section
        title={`Latest ${orders.data?.length ?? 0} orders`}
        gap={12}
      >
        {orders.loading && !orders.data ? (
          <Card style={{ padding: 20, gap: 18 }}>
            <Skeleton height={44} />
            <Skeleton height={44} width="80%" />
          </Card>
        ) : orders.data?.length ? (
          <ListCard>
            {orders.data.map((order) => (
              <Row
                key={order.id}
                title={`${order.side === "buy" ? "Buy" : "Sell"} ${order.units} ${
                  products.data?.find((item) => item.id === order.productId)?.ticker ??
                  "units"
                }`}
                subtitle={`${order.status} · ${formatDate(order.createdAt)}`}
                icon="receipt-outline"
                chevron
                onPress={() => setSelected(order.id)}
              />
            ))}
          </ListCard>
        ) : !orders.error ? (
          <EmptyState
            icon="receipt-outline"
            title="No orders yet"
            message="Your investment orders will appear here."
          />
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    padding: 20,
    gap: 12,
  },
});
