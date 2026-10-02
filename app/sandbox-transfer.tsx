import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";

import { ApiError, api } from "@/src/api/client";
import { toast } from "@/src/components/Toast";
import {
  Banner,
  Button,
  Card,
  DetailRow,
  Divider,
  EmptyState,
  HeaderBar,
  ListCard,
  Screen,
  Section,
  SectionHeader,
  Skeleton,
  Stack,
  rowTextInset,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatMoney, maskAccountNumber } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import { currencySymbol, DEFAULT_CURRENCY } from "@/src/lib/currency";
import { confirmStepUp } from "@/src/lib/stepUp";
import type { Account, CurrencyCode, TransferQuote } from "@/src/types";

export default function SandboxTransfer() {
  const router = useRouter();
  const { colors, radii } = useTheme();

  const accounts = useApi(() => api.accounts.list(), []);

  const [selectedRecipient, setSelectedRecipient] = useState<Account | null>(null);
  const [fromId, setFromId] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; amount: number; currency: CurrencyCode } | null>(null);
  const [quote, setQuote] = useState<TransferQuote | null>(null);

  const amount = Number(raw.replace(/[^0-9.]/g, "")) || 0;

  const source = useMemo(
    () => accounts.data?.find((a) => a.id === fromId) ?? accounts.data?.[0],
    [accounts.data, fromId],
  );

  const currency = source?.currency ?? DEFAULT_CURRENCY;
  const symbol = currencySymbol(currency);
  const maxAmount = source ? source.balance : 0;
  const insufficient = amount > 0 && source ? amount > source.balance : false;

  const recipients = useMemo(
    () => accounts.data?.filter((a) => a.id !== source?.id) ?? [],
    [accounts.data, source?.id],
  );

  const [retrying, setRetrying] = useState(false);
  const pending = useRef<{ body: Parameters<typeof api.transfers.sendSandbox>[0]; key: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      if (!source || amount <= 0) {
        if (!cancelled) setQuote(null);
        return;
      }
      try {
        const q = await api.transfers.quoteSandbox(source.id, amount, currency);
        if (!cancelled) setQuote(q);
      } catch {
        if (!cancelled) setQuote(null);
      }
    };
    fetchQuote();
    return () => { cancelled = true; };
  }, [source?.id, amount, currency]);

  const submit = async () => {
    if (sending || (!pending.current && (!selectedRecipient || !source || !quote))) return;
    setError(null);
    setSending(true);
    try {
      if (!pending.current) {
        if (!selectedRecipient || !source || !quote) return;
        const stepUpToken = await confirmStepUp("transfer",
          `Send ${formatMoney(amount, currency)} to ${selectedRecipient.name} (internal), with a fee of ${formatMoney(quote.fee, currency)}?`);
        if (!stepUpToken) return;
        const body = {
          fromAccountId: source.id,
          recipientAccountId: selectedRecipient.id,
          amount,
          currency,
          note: note.trim(),
          stepUpToken,
        };
        pending.current = {
          body,
          key: `sandbox-transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
      }
      const currentPending = pending.current;
      if (!currentPending) return;
      const result = await api.transfers.sendSandbox(currentPending.body, currentPending.key);
      pending.current = null;
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setReceipt({ reference: result.reference, amount: result.amount, currency: result.currency });
      toast.success("Internal transfer submitted.");
      setRaw("");
      setNote("");
      setSelectedRecipient(null);
      setQuote(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed.");
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && ![408, 409, 429].includes(err.status)) pending.current = null;
      setError(pending.current ? "The transfer outcome is uncertain. Retry the original transfer here before starting another." : err instanceof ApiError ? err.message : "Transfer failed");
    } finally {
      setRetrying(pending.current !== null);
      setSending(false);
    }
  };

  if (receipt) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Sandbox Transfer" onBack={() => router.back()} />
        <Card style={{ padding: 28, alignItems: "center", gap: 14 }}>
          <View style={[styles.tick, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="checkmark" size={30} color={colors.accent} />
          </View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
            {formatMoney(receipt.amount, receipt.currency)} sent
          </Text>
          <Text style={{ color: colors.textSubtle, fontSize: 14, textAlign: "center" }}>
            Reference {receipt.reference}
          </Text>
          <Button
            label="Done"
            size="lg"
            onPress={() => router.replace("/home")}
            style={{ marginTop: 6, alignSelf: "stretch" }}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen gap={24}>
      <HeaderBar title="Internal Transfer" onBack={() => router.back()} />

      {error ? <Banner tone="danger" message={error} /> : null}

      <Card style={{ padding: 20, gap: 16 }}>
        <SectionHeader title="Amount" />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ color: colors.textMuted, fontSize: 32, fontWeight: "700" }}>
            {symbol}
          </Text>
          <TextInput
            value={raw}
            onChangeText={setRaw}
            placeholder="0.00"
            placeholderTextColor={colors.textSubtle}
            keyboardType="decimal-pad"
            accessibilityLabel="Transfer amount"
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 40,
              fontWeight: "800",
              padding: 0,
            }}
          />
        </View>

        {amount > 0 && quote ? (
          <Stack gap={10}>
            <Line label="Estimated fee" value={formatMoney(quote.fee, currency)} />
            <Line label="Total to be debited" value={formatMoney(amount + quote.fee, currency)} accent />
            <Line label="Estimated arrival" value={quote.estimatedArrival} />
          </Stack>
        ) : null}

        {insufficient ? (
          <Banner
            tone="danger"
            message={`You only have ${formatMoney(maxAmount, currency)} available in ${source?.name}.`}
          />
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {[50, 100, 500, maxAmount > 0 ? Math.floor(maxAmount) : 0]
            .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
            .map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setRaw(String(preset))}
                accessibilityRole="button"
                accessibilityLabel={`Use ${formatMoney(preset, currency)}`}
                style={({ pressed }) => [
                  styles.preset,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surfaceRaised : "transparent",
                  },
                ]}
              >
                <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "700" }}>
                  {preset === Math.floor(maxAmount) && maxAmount > 0 ? "Max" : formatMoney(preset, currency, { compact: true })}
                </Text>
              </Pressable>
            ))}
        </View>
      </Card>

      <Section title="From" gap={12}>
        {accounts.loading ? (
          <Card style={{ padding: 20 }}>
            <Skeleton height={20} />
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {accounts.data?.map((account) => {
                const active = source?.id === account.id;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => setFromId(account.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.accountChip,
                      {
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: active ? colors.accentSoft : colors.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
                      {account.name}
                    </Text>
                    <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
                      {formatMoney(account.balance, account.currency)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </Section>

      <Section title="To (Internal Account)" gap={12}>
        {accounts.loading ? (
          <Card style={{ padding: 20, gap: 12 }}>
            <Skeleton height={18} />
            <Skeleton height={18} width="70%" />
          </Card>
        ) : recipients.length ? (
          <ListCard>
            {recipients.map((account, index) => {
              const active = selectedRecipient?.id === account.id;
              return (
                <View key={account.id}>
                  <Pressable
                    onPress={() => setSelectedRecipient(active ? null : account)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.person,
                      pressed && { backgroundColor: colors.surfaceRaised },
                    ]}
                  >
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: active ? colors.accent : colors.surfaceRaised },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? "#052E16" : colors.textMuted,
                          fontWeight: "800",
                          fontSize: 13,
                        }}
                      >
                        {account.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
                        {account.name}
                      </Text>
                      <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                        {account.kind} · {maskAccountNumber(account.number)}
                      </Text>
                    </View>
                    <Ionicons
                      name={active ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={active ? colors.accent : colors.border}
                    />
                  </Pressable>
                  {index < recipients.length - 1 ? <Divider inset={rowTextInset(38)} /> : null}
                </View>
              );
            })}
          </ListCard>
        ) : (
          <EmptyState
            icon="wallet-outline"
            title="No other accounts"
            message="You need at least two accounts to make internal transfers."
          />
        )}
      </Section>

      <Card style={{ padding: 20, gap: 12 }}>
        <SectionHeader title="Note (optional)" />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What is this for?"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Transfer note"
          style={{
            color: colors.text,
            fontSize: 15,
            minHeight: 48,
            borderRadius: radii.md,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
          }}
        />
      </Card>

      <Button
        label={sending ? "Sending" : retrying ? "Retry original transfer" : "Send money"}
        size="lg"
        loading={sending}
        disabled={sending || (!retrying && (!selectedRecipient || !source || amount <= 0 || insufficient || !quote))}
        onPress={submit}
      />

      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 13,
          textAlign: "center",
          lineHeight: 19,
        }}
      >
        This is a sandbox feature for testing internal transfers. No real money is moved.
      </Text>
    </Screen>
  );
}

function Line({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <DetailRow label={label} value={value} valueColor={accent ? colors.accent : undefined} />
  );
}

const styles = {
  tick: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  accountChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 150,
    gap: 3,
  },
  person: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};