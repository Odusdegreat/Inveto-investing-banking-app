import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "@/src/api/client";
import {
  Button,
  Card,
  ErrorState,
  HeaderBar,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
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

  return (
    <Screen onRefresh={reload} refreshing={loading}>
      <HeaderBar
        title="Accounts"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={() => router.push("/transfer")}
            accessibilityRole="button"
            accessibilityLabel="Add account"
            hitSlop={8}
          >
            <Ionicons name="add" size={22} color={colors.accent} />
          </Pressable>
        }
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
          Total across {data?.length ?? 0} accounts
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 30,
            fontWeight: "800",
            marginTop: 4,
          }}
        >
          {formatMoney(total, currency)}
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <Button
            label="Send"
            icon="arrow-up-outline"
            onPress={() => router.push("/transfer")}
            style={{ flex: 1 }}
          />
          <Button
            label="Receive"
            icon="arrow-down-outline"
            variant="secondary"
            onPress={() => router.push("/transfer")}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      <SectionHeader title="Your accounts" />

      {loading && !data ? (
        <Card style={{ padding: 18, gap: 14 }}>
          <Skeleton height={22} />
          <Skeleton height={16} width="60%" />
          <Skeleton height={22} />
        </Card>
      ) : (
        (data ?? []).map((account) => (
          <AccountRow key={account.id} account={account} />
        ))
      )}
    </Screen>
  );
}

function AccountRow({ account }: { account: Account }) {
  const { colors, radii } = useTheme();

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        marginBottom: 12,
      }}
    >
      <Row
        title={account.name}
        subtitle={`${maskAccountNumber(account.number)} · ${account.interestRate}% p.a.`}
        left={
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accentSoft,
            }}
          >
            <Ionicons name={ACCOUNT_ICON[account.kind]} size={19} color={colors.accent} />
          </View>
        }
        right={
          <View style={{ alignItems: "flex-end", gap: 3 }}>
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
    </View>
  );
}
