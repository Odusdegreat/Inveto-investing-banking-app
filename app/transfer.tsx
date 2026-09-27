import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ApiError, api } from "@/src/api/client";
import {
  Banner,
  Button,
  Card,
  EmptyState,
  HeaderBar,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatMoney, maskAccountNumber } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import { currencySymbol, DEFAULT_CURRENCY } from "@/src/lib/currency";
import { confirmStepUp } from "@/src/lib/stepUp";
import type { Beneficiary } from "@/src/types";

const FEE_RATE = 0.0075;
const MIN_FEE = 1;
const MAX_FEE = 18;

function feeFor(amount: number) {
  return Math.min(MAX_FEE, Math.max(MIN_FEE, amount * FEE_RATE));
}

export default function Transfer() {
  const router = useRouter();
  const { colors, radii } = useTheme();

  const accounts = useApi(() => api.accounts.list(), []);
  const beneficiaries = useApi(() => api.beneficiaries.list(), []);

  const [selected, setSelected] = useState<Beneficiary | null>(null);
  const [fromId, setFromId] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{ reference: string; amount: number } | null>(
    null,
  );

  const amount = Number(raw.replace(/[^0-9.]/g, "")) || 0;
  const fee = amount > 0 ? feeFor(amount) : 0;

  const source = useMemo(
    () => accounts.data?.find((a) => a.id === fromId) ?? accounts.data?.[0],
    [accounts.data, fromId],
  );

  const currency = source?.currency ?? DEFAULT_CURRENCY;
  const symbol = currencySymbol(currency);
  const maxAmount = source ? Math.max(source.balance - feeFor(source.balance), 0) : 0;
  const insufficient = amount > 0 && source ? amount + fee > source.balance : false;

  const submit = async () => {
    if (!selected || !source) return;
    setError(null);

    const stepUpToken = await confirmStepUp(
      `Confirm sending ${formatMoney(amount, currency)} to ${selected.name}.`,
    );
    if (!stepUpToken) {
      setError("Transfer cancelled. Your PIN is required to send money.");
      return;
    }

    setSending(true);
    try {
      const result = await api.transfers.send({
        beneficiaryId: selected.id,
        fromAccountId: source.id,
        amount,
        fee,
        note: note.trim(),
        stepUpToken,
      });
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
      setReceipt({ reference: result.reference, amount: result.amount });
      setRaw("");
      setNote("");
      setSelected(null);
    } catch (err) {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      ).catch(() => undefined);
      setError(err instanceof ApiError ? err.message : "Transfer failed");
    } finally {
      setSending(false);
    }
  };

  if (receipt) {
    return (
      <Screen>
        <HeaderBar title="Transfer" onBack={() => router.back()} />
        <Card style={{ padding: 24, alignItems: "center", gap: 12 }}>
          <View style={[styles.tick, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="checkmark" size={30} color={colors.accent} />
          </View>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
            {formatMoney(receipt.amount, currency)} sent
          </Text>
          <Text
            style={{ color: colors.textSubtle, fontSize: 13, textAlign: "center" }}
          >
            Reference {receipt.reference}
          </Text>
          <Button
            label="Done"
            onPress={() => router.replace("/home")}
            style={{ marginTop: 8, alignSelf: "stretch" }}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <HeaderBar title="Send money" onBack={() => router.back()} />

      {error ? <Banner tone="danger" message={error} /> : null}

        <Card style={{ padding: 18, gap: 14 }}>
          <SectionHeader title="Amount" />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 30, fontWeight: "700" }}>
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

          {amount > 0 ? (
            <View style={styles.breakdown}>
              <Line
                label="Transfer fee"
                value={formatMoney(fee, currency)}
              />
              <Line
                label="Total to be debited"
                value={formatMoney(amount + fee, currency)}
                strong
              />
            </View>
          ) : null}

          {insufficient ? (
            <Banner
              tone="danger"
              message={`You only have ${formatMoney(maxAmount, currency)} available in ${source?.name}.`}
            />
          ) : null}

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
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
                  <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "700" }}>
                    {preset === Math.floor(maxAmount) && maxAmount > 0
                      ? "Max"
                      : formatMoney(preset, currency, { compact: true })}
                  </Text>
                </Pressable>
              ))}
          </View>
        </Card>

        <View>
          <SectionHeader title="From" />
          {accounts.loading ? (
            <Card style={{ padding: 18 }}>
              <Skeleton height={20} />
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
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
                          backgroundColor: active
                            ? colors.accentSoft
                            : colors.surface,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>
                        {account.name}
                      </Text>
                      <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                        {formatMoney(account.balance, account.currency)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        <View>
          <SectionHeader title="To" />
          {beneficiaries.loading ? (
            <Card style={{ padding: 18, gap: 10 }}>
              <Skeleton height={18} />
              <Skeleton height={18} width="70%" />
            </Card>
          ) : beneficiaries.data?.length ? (
            <Card style={{ paddingVertical: 6 }}>
              {beneficiaries.data.map((person, index) => {
                const active = selected?.id === person.id;
                return (
                  <View key={person.id}>
                    <Pressable
                      onPress={() => setSelected(active ? null : person)}
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
                          {person.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
                          {person.name}
                        </Text>
                        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                          {person.bank} · {maskAccountNumber(person.accountNumber)}
                        </Text>
                      </View>
                      <Ionicons
                        name={active ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={active ? colors.accent : colors.border}
                      />
                    </Pressable>
                    {index < beneficiaries.data!.length - 1 ? (
                      <View
                        style={{
                          height: 1,
                          marginLeft: 62,
                          backgroundColor: colors.border,
                        }}
                      />
                    ) : null}
                  </View>
                );
              })}
            </Card>
          ) : (
            <EmptyState
              icon="people-outline"
              title="No beneficiaries yet"
              message="Add someone you send money to regularly."
            />
          )}
        </View>

        <Card style={{ padding: 18, gap: 10 }}>
          <SectionHeader title="Note (optional)" />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What is this for?"
            placeholderTextColor={colors.textSubtle}
            accessibilityLabel="Transfer note"
            style={{
              color: colors.text,
              fontSize: 14,
              minHeight: 44,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
            }}
          />
        </Card>

        <Button
          label={sending ? "Sending" : "Send money"}
          size="lg"
          loading={sending}
          disabled={!selected || !source || amount <= 0 || insufficient}
          onPress={submit}
        />

        <Text
          style={{
            color: colors.textSubtle,
            fontSize: 12,
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          Transfers settle instantly. A fee of {FEE_RATE * 100}% (min{" "}
          {formatMoney(MIN_FEE, currency)}, max {formatMoney(MAX_FEE, currency)})
          applies.
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
    <View style={styles.breakdownRow}>
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
          fontWeight: strong ? "700" : "600",
        }}
      >
        {value}
      </Text>
    </View>
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
  breakdown: { gap: 6 },
  breakdownRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
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
