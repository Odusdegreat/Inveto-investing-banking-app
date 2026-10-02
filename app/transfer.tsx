import { toast } from "@/src/components/Toast";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ApiError, api } from "@/src/api/client";
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
import { DemoBanner } from "@/src/components/DemoBanner";
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
  const [simulateFailure, setSimulateFailure] = useState(false);

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

  const [retrying, setRetrying] = useState(false);
  const pending = useRef<{ body: Parameters<typeof api.transfers.send>[0]; key: string } | null>(null);

  const simulateSuccess = async () => {
    if (sending || !selected || !source || amount <= 0 || insufficient) return;
    setError(null);
    setSending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      const reference = `SIM-${Date.now().toString(36).toUpperCase()}`;
      setReceipt({ reference, amount });
      toast.success("Simulated transfer successful.");
      setRaw("");
      setNote("");
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed.");
      setError("Simulated transfer failed");
    } finally {
      setSending(false);
    }
  };

  const simulateFail = async () => {
    if (sending || !selected || !source || amount <= 0) return;
    setError(null);
    setSending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      throw new Error("Simulated payment failure: Insufficient funds");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulated failure");
      setError(err instanceof Error ? err.message : "Simulated failure");
    } finally {
      setSending(false);
    }
  };

  if (receipt) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Transfer" onBack={() => router.back()} />
        <DemoBanner />
        <Card style={{ padding: 28, alignItems: "center", gap: 14 }}>
          <View style={[styles.tick, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="checkmark" size={30} color={colors.accent} />
          </View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
            {formatMoney(receipt.amount, currency)} sent
          </Text>
          <Text
            style={{ color: colors.textSubtle, fontSize: 14, textAlign: "center" }}
          >
            Reference {receipt.reference}
          </Text>
          <View style={styles.demoWatermark}>
            <Text style={styles.watermarkText}>DEMO</Text>
          </View>
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
      <HeaderBar title="Simulated Transfer" onBack={() => router.back()} />
      <DemoBanner />

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

        {amount > 0 ? (
          <Stack gap={10}>
            <Line
              label="Estimated fee"
              value={formatMoney(fee, currency)}
            />
            <Line
              label="Total to be debited"
              value={formatMoney(amount + fee, currency)}
              strong
            />
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
                  {preset === Math.floor(maxAmount) && maxAmount > 0
                    ? "Max"
                    : formatMoney(preset, currency, { compact: true })}
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
                        backgroundColor: active
                          ? colors.accentSoft
                          : colors.surface,
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

      <Section
        title="To"
        gap={12}
        action="Manage"
        onAction={() => router.push("/beneficiaries")}
      >
        {beneficiaries.loading ? (
          <Card style={{ padding: 20, gap: 12 }}>
            <Skeleton height={18} />
            <Skeleton height={18} width="70%" />
          </Card>
        ) : beneficiaries.data?.length ? (
          <ListCard>
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
                    <Divider inset={rowTextInset(38)} />
                  ) : null}
                </View>
              );
            })}
          </ListCard>
        ) : (
          <EmptyState
            icon="people-outline"
            title="No beneficiaries yet"
            message="Add someone you send money to regularly."
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

      <View style={styles.simulateButtons}>
        <Button
          label={sending ? "Processing..." : "Simulate Success"}
          size="lg"
          loading={sending}
          disabled={sending || (!selected || !source || amount <= 0 || insufficient)}
          onPress={simulateSuccess}
        />
        <Button
          label={sending ? "Processing..." : "Simulate Failure"}
          size="lg"
          variant="ghost"
          loading={sending}
          disabled={sending || !selected || !source || amount <= 0}
          onPress={simulateFail}
          style={{ marginTop: 10 }}
        />
      </View>

      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 13,
          textAlign: "center",
          lineHeight: 19,
        }}
      >
        Simulated payments. No real money is moved.
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
    <DetailRow
      label={label}
      value={value}
      valueColor={strong ? colors.accent : undefined}
    />
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
  simulateButtons: {
    marginTop: 8,
  },
  demoWatermark: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 9999,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  watermarkText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "rgba(0,0,0,0.3)",
    letterSpacing: 2,
  },
};