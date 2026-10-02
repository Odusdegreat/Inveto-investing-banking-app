import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api/client";
import { toast } from "@/src/components/Toast";
import {
  Button,
  Card,
  DetailRow,
  Divider,
  ErrorState,
  HeaderBar,
  IconBadge,
  Screen,
  Section,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatDate, formatMoney, maskAccountNumber } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Account } from "@/src/types";

const ACCOUNT_ICON: Record<Account["kind"], React.ComponentProps<typeof Ionicons>["name"]> = {
  wallet: "wallet-outline",
  current: "phone-portrait-outline",
  savings: "lock-closed-outline",
  investment: "trending-up-outline",
};

const ACCOUNT_KIND_LABEL: Record<Account["kind"], string> = {
  wallet: "Wallet",
  current: "Current",
  savings: "Savings",
  investment: "Investment",
};

export default function Receive() {
  const router = useRouter();
  const params = useLocalSearchParams<{ accountId?: string | string[] }>();
  const { colors, radii } = useTheme();
  const requested = typeof params.accountId === "string" ? params.accountId : undefined;
  const [picked, setPicked] = useState<string | null>(requested ?? null);
  const [revealed, setRevealed] = useState(false);

  const accounts = useApi(() => api.accounts.list(), []);
  const list = accounts.data ?? [];

  const selected = list.find((account) => account.id === picked) ?? list[0];

  const details = selected
    ? [
        `Account name: ${selected.name}`,
        `Bank: INVETO`,
        `Account number: ${selected.number ?? "Not available"}`,
        `Account type: ${ACCOUNT_KIND_LABEL[selected.kind]}`,
      ].join("\n")
    : "";

  const share = async () => {
    if (!selected) return;
    try {
      await Share.share({
        title: "My INVETO account details",
        message: `Send money to my INVETO ${ACCOUNT_KIND_LABEL[selected.kind].toLowerCase()} account.\n\n${details}`,
      });
    } catch {
      toast.error("Could not open the share sheet.");
    }
  };

  if (accounts.error) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Receive" onBack={() => router.back()} />
        <ErrorState message={accounts.error} onRetry={accounts.reload} />
      </Screen>
    );
  }

  if (accounts.loading && !accounts.data) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Receive" onBack={() => router.back()} />
        <Card style={{ padding: 22, gap: 18 }}>
          <Skeleton height={22} width="45%" />
          <Skeleton height={56} />
          <Skeleton height={22} width="70%" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen gap={24}>
      <HeaderBar title="Receive" onBack={() => router.back()} />

      <Section gap={14}>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
          Share these details with the person sending you money. They stay private
          until you choose to send them.
        </Text>
        <Button
          label="Share account details"
          icon="share-outline"
          size="lg"
          disabled={!selected}
          onPress={share}
        />
      </Section>

      {!selected ? (
        <Card style={{ padding: 22 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>
            You need an account before you can receive money. Open one from the
            Accounts screen first.
          </Text>
        </Card>
      ) : (
        <>
          <Section title="Choose an account" gap={10}>
            {list.map((account) => {
              const active = account.id === selected.id;
              return (
                <Pressable
                  key={account.id}
                  onPress={() => {
                    setPicked(account.id);
                    setRevealed(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, disabled: account.frozen }}
                  accessibilityLabel={`${account.name}, ${formatMoney(account.balance, account.currency)}`}
                  style={({ pressed }) => [
                    styles.accountRow,
                    {
                      borderRadius: radii.xl,
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
                    },
                  ]}
                >
                  <IconBadge
                    icon={ACCOUNT_ICON[account.kind]}
                    tone={active ? "accent" : "neutral"}
                  />
                  <View style={styles.accountBody}>
                    <Text
                      numberOfLines={1}
                      style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}
                    >
                      {account.name}
                    </Text>
                    <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
                      {ACCOUNT_KIND_LABEL[account.kind]} ·{" "}
                      {maskAccountNumber(account.number)}
                    </Text>
                  </View>
                  <View style={styles.accountRight}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                      {formatMoney(account.balance, account.currency)}
                    </Text>
                    <Ionicons
                      name={active ? "radio-button-on" : "radio-button-off"}
                      size={17}
                      color={active ? colors.accent : colors.textSubtle}
                    />
                  </View>
                </Pressable>
              );
            })}
          </Section>

          <Section title="Your details" gap={12}>
            <Card style={styles.detailCard}>
              <DetailRow
                label="Account name"
                value={selected.name}
                selectable
              />
              <Divider />
              <DetailRow label="Bank" value="INVETO" />
              <Divider />
              <View style={styles.numberRow}>
                <Text style={[styles.numberLabel, { color: colors.textSubtle }]}>
                  Account number
                </Text>
                <Pressable
                  onPress={() => setRevealed((current) => !current)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    revealed ? "Hide account number" : "Show account number"
                  }
                  accessibilityState={{ selected: revealed }}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.reveal,
                    {
                      borderRadius: radii.md,
                      backgroundColor: pressed ? colors.surfaceRaised : colors.surfaceSunken,
                    },
                  ]}
                >
                  <Text
                    style={[styles.numberValue, { color: colors.text }]}
                    selectable
                  >
                    {revealed
                      ? (selected.number ?? "Not available")
                      : maskAccountNumber(selected.number)}
                  </Text>
                  <Ionicons
                    name={revealed ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>
              <Divider />
              <DetailRow
                label="Account type"
                value={ACCOUNT_KIND_LABEL[selected.kind]}
              />
              <Divider />
              <DetailRow
                label="Available balance"
                value={formatMoney(selected.balance, selected.currency)}
              />
              <Divider />
              <DetailRow label="Opened" value={formatDate(selected.openedAt)} />
            </Card>
          </Section>

          {selected.frozen ? (
            <Card style={[styles.notice, { borderColor: colors.warning }]}>
              <Ionicons name="warning" size={19} color={colors.warning} />
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, flex: 1 }}>
                This account is frozen, so incoming transfers will be declined. Unfreeze
                it from the account list before asking for money.
              </Text>
            </Card>
          ) : null}

          <Card style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, flex: 1 }}>
              Only share these details with people you trust. INVETO will never ask you
              for your account number or PIN.
            </Text>
          </Card>
        </>
      )}

      {Platform.OS === "web" ? (
        <Text style={{ color: colors.textSubtle, fontSize: 12, textAlign: "center" }}>
          Select and copy the details above to share them.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderWidth: 1,
  },
  accountBody: {
    flex: 1,
    gap: 5,
  },
  accountRight: {
    alignItems: "flex-end",
    gap: 7,
  },
  detailCard: {
    paddingHorizontal: 22,
    paddingVertical: 8,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 14,
  },
  numberLabel: {
    fontSize: 14,
  },
  reveal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  numberValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 18,
  },
});
