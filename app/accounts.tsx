import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api/client";
import {
  Button,
  Card,
  Divider,
  ErrorState,
  HeaderBar,
  IconBadge,
  ListCard,
  Row,
  Screen,
  Section,
  Skeleton,
  rowTextInset,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatMoney, maskAccountNumber } from "@/src/lib/format";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Account } from "@/src/types";

const ACCOUNT_ICON: Record<Account["kind"], React.ComponentProps<typeof Ionicons>["name"]> = {
  wallet: "wallet-outline",
  current: "phone-portrait-outline",
  savings: "lock-closed-outline",
  investment: "trending-up-outline",
};

export default function Accounts() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, loading, error, reload } = useApi(() => api.accounts.list(), []);

  const total = data?.reduce((sum, account) => sum + account.balance, 0) ?? 0;
  const currency = data?.[0]?.currency ?? DEFAULT_CURRENCY;
  const frozen = data?.filter((account) => account.frozen).length ?? 0;

  return (
    <Screen gap={24} onRefresh={reload} refreshing={loading}>
      <HeaderBar title="Accounts" onBack={() => router.back()} />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <Card style={styles.summary}>
        <View style={styles.summaryHead}>
          <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
            Total across {data?.length ?? 0} account{data?.length === 1 ? "" : "s"}
          </Text>
          {frozen > 0 ? (
            <Text style={{ color: colors.warning, fontSize: 12, fontWeight: "700" }}>
              {frozen} frozen
            </Text>
          ) : null}
        </View>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: "800" }}>
          {formatMoney(total, currency)}
        </Text>
        <View style={styles.actions}>
          <ActionTile
            label="Send"
            icon="arrow-up-outline"
            onPress={() => router.push("/transfer")}
          />
          <ActionTile
            label="Receive"
            icon="arrow-down-outline"
            onPress={() => router.push("/receive")}
          />
          <ActionTile
            label="History"
            icon="receipt-outline"
            onPress={() => router.push("/transactions")}
          />
        </View>
      </Card>

      <Section title="Your accounts" gap={12}>
        {loading && !data ? (
          <Card style={{ padding: 20, gap: 16 }}>
            <Skeleton height={44} />
            <Skeleton height={44} width="80%" />
            <Skeleton height={44} width="90%" />
          </Card>
        ) : data?.length ? (
          <ListCard>
            {data.map((account, index) => (
              <View key={account.id}>
                <AccountRow
                  account={account}
                  onPress={() =>
                    router.push({
                      pathname: "/receive",
                      params: { accountId: account.id },
                    })
                  }
                />
                {index < data.length - 1 ? <Divider inset={rowTextInset(42)} /> : null}
              </View>
            ))}
          </ListCard>
        ) : (
          <Card style={{ padding: 20 }}>
            <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
              You do not have an account yet. Once one is opened it will appear here
              with its balance and details.
            </Text>
          </Card>
        )}
      </Section>

      <Button
        label="Open another account"
        icon="add"
        onPress={() => router.push("/open-account")}
      />

      <Section title="Statements" gap={12}>
        <ListCard style={{ paddingHorizontal: 12 }}>
          <Row
            title="Download a statement"
            subtitle="PDF, CSV or OFX for any period"
            icon="document-text-outline"
            chevron
            onPress={() => router.push("/statements")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Portfolio analytics"
            subtitle="Allocation, yield and costs"
            icon="analytics-outline"
            chevron
            onPress={() => router.push("/portfolio-analytics")}
          />
        </ListCard>
      </Section>
    </Screen>
  );
}

function ActionTile({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  const { colors, radii } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        {
          borderRadius: radii.lg,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surfaceSunken,
        },
      ]}
    >
      <Ionicons name={icon} size={19} color={colors.accent} />
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function AccountRow({ account, onPress }: { account: Account; onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <Row
      title={account.name}
      subtitle={`${maskAccountNumber(account.number)} · ${account.interestRate == null ? "Rate not available" : `${account.interestRate}% p.a.`}`}
      onPress={onPress}
      left={
        <IconBadge
          icon={ACCOUNT_ICON[account.kind]}
          tone={account.frozen ? "warning" : "accent"}
        />
      }
      right={
        <View style={styles.balance}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
            {formatMoney(account.balance, account.currency)}
          </Text>
          {account.frozen ? (
            <Text style={{ color: colors.warning, fontSize: 11, fontWeight: "700" }}>
              Frozen
            </Text>
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: 20,
    gap: 6,
  },
  summaryHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  action: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
  },
  balance: {
    alignItems: "flex-end",
    gap: 3,
  },
});
