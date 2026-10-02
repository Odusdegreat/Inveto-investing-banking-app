import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { StatStrip, StatTile, TextField } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  Chip,
  DetailRow,
  Divider,
  EmptyState,
  HeaderBar,
  ListCard,
  Screen,
  Section,
  SegmentedTabs,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { useCurrency } from "@/src/hooks/useCurrency";
import { currencySymbol } from "@/src/lib/currency";
import { formatDate, formatMoney, formatRelative } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import { confirmStepUp } from "@/src/lib/stepUp";
import { api } from "@/src/api/client";
import type { ExternalBank, ExternalTransfer } from "@/src/types";

type Step = "details" | "review" | "done";
type Direction = "outbound" | "inbound";

function generateIdempotencyKey(): string {
  return `ext-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ExternalTransferScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { currency } = useCurrency();

  const banksApi = useApi(() => api.externalTransfers.banks({ limit: 50 }), []);
  const transfersApi = useApi(() => api.externalTransfers.list({ limit: 20 }), []);

  const [step, setStep] = useState<Step>("details");
  const [direction, setDirection] = useState<Direction>("outbound");
  const [name, setName] = useState("");
  const [selectedBank, setSelectedBank] = useState<ExternalBank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewStartedAt, setReviewStartedAt] = useState(() => Date.now());
  const [quote, setQuote] = useState<{ fee: number; total: number; sufficientFunds: boolean } | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const value = Number(amount) || 0;
  const fee = quote?.fee ?? 0;
  const total = quote?.total ?? value + fee;

  const digits = accountNumber.replace(/\D/g, "");
  const nameOk = name.trim().length > 1;
  const accountOk = digits.length >= 6;
  const amountOk = value > 0;
  const bankOk = !!selectedBank;
  const sufficientFunds = quote?.sufficientFunds ?? true;
  const valid = nameOk && accountOk && amountOk && bankOk && sufficientFunds;

  const fetchQuote = useCallback(async () => {
    if (!selectedBank || value <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    try {
      setQuoteError(null);
      const q = await api.externalTransfers.quote({
        fromAccountId: "default",
        externalBankId: selectedBank.id,
        accountNumber: digits,
        amount: value,
      });
      setQuote(q);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Failed to get quote");
      setQuote(null);
    }
  }, [selectedBank, value, digits]);

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 300);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const handleSubmit = async () => {
    if (!valid || !selectedBank) return;
    setBusy(true);
    try {
      const stepUpToken = await confirmStepUp("transfer", `Confirm ${formatMoney(total, currency)} external transfer`);
      if (!stepUpToken) {
        setBusy(false);
        return;
      }
      const idempotencyKey = generateIdempotencyKey();
      await api.externalTransfers.create(
        {
          fromAccountId: "default",
          externalBankId: selectedBank.id,
          accountNumber: digits,
          accountName: name.trim(),
          amount: value,
          stepUpToken,
          note: reference.trim() || undefined,
        },
        idempotencyKey
      );
      await transfersApi.reload();
      setBusy(false);
      setStep("done");
    } catch (err) {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep("details");
    setName("");
    setAccountNumber("");
    setAmount("");
    setReference("");
    setSelectedBank(null);
    setQuote(null);
    setQuoteError(null);
    setReviewStartedAt(Date.now());
  };

  if (step === "done") {
    return (
      <Screen gap={24}>
        <HeaderBar title="Transfer" onBack={() => router.replace("/external-transfer")} />
        <Card style={{ padding: 28, alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 26,
              backgroundColor: colors.accentSoft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark-circle" size={38} color={colors.accent} />
          </View>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>
            {direction === "outbound" ? "Transfer on its way" : "Details received"}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 21 }}>
            {direction === "outbound"
              ? `${formatMoney(total, currency)} is on its way to ${name.trim()}. Most transfers arrive within one business day.`
              : `We are verifying the account details for ${name.trim()}. You will get a push notification the moment it clears.`}
          </Text>
        </Card>
        <Button label="Make another transfer" variant="secondary" onPress={reset} />
        <Button label="Back to transfers" onPress={() => router.replace("/transactions")} />
      </Screen>
    );
  }

  if (step === "review") {
    return (
      <Screen gap={24}>
        <HeaderBar title="Review transfer" onBack={() => setStep("details")} />

        <Card style={{ padding: 22, gap: 6, alignItems: "center" }}>
          <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
            {direction === "outbound" ? "You're sending" : "You're requesting"}
          </Text>
          <Text style={{ color: colors.text, fontSize: 34, fontWeight: "800" }}>
            {formatMoney(total, currency)}
          </Text>
          {fee > 0 ? (
            <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
              {formatMoney(value, currency)} plus {formatMoney(fee, currency)} fee
            </Text>
          ) : null}
        </Card>

        <Section title="Recipient" gap={12}>
          <ListCard style={{ paddingHorizontal: 14 }}>
            <DetailRow label="Name" value={name.trim()} />
            <Divider />
            <DetailRow label="Bank" value={selectedBank?.name ?? ""} />
            <Divider />
            <DetailRow label="Account number" value={`•••• ${digits.slice(-4)}`} wide />
            {reference.trim() ? (
              <>
                <Divider />
                <DetailRow label="Your reference" value={reference.trim()} />
              </>
            ) : null}
          </ListCard>
        </Section>

        <Section title="Timing" gap={12}>
          <ListCard style={{ paddingHorizontal: 14 }}>
            <DetailRow label="Leaves your account" value="Immediately" />
            <Divider />
            <DetailRow
              label="Expected to arrive"
              value={direction === "outbound" ? formatDate(new Date(reviewStartedAt + 86_400_000).toISOString()) : "On verification"}
            />
            <Divider />
            <DetailRow label="Reversible" value="No" />
          </ListCard>
        </Section>

        <Banner
          tone="warning"
          icon="warning-outline"
          message="Check the name and account number carefully. We cannot reverse a transfer to the wrong account."
        />

        <Button
          label={busy ? "Sending…" : `Confirm ${formatMoney(total, currency)}`}
          size="lg"
          loading={busy}
          onPress={handleSubmit}
        />
      </Screen>
    );
  }

  return (
    <Screen gap={24}>
      <HeaderBar title="External transfer" onBack={() => router.back()} />

      <SegmentedTabs
        options={[
          { key: "outbound" as Direction, label: "Send" },
          { key: "inbound" as Direction, label: "Receive" },
        ]}
        value={direction}
        onChange={(next) => {
          setDirection(next);
          setAmount("");
          setSelectedBank(null);
          setQuote(null);
          setQuoteError(null);
        }}
      />

      <Section title={direction === "outbound" ? "Recipient bank details" : "Your bank details"} gap={12}>
        <TextField
          label={direction === "outbound" ? "Account holder name" : "Name on the INVETO account"}
          value={name}
          onChangeText={setName}
          placeholder="As it appears on the bank account"
          autoCapitalize="words"
          error={name.length > 0 && !nameOk ? "Enter the full name." : null}
        />

        {direction === "outbound" ? (
          <>
            <View style={{ gap: 7 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>Bank</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {banksApi.data?.map((bank) => (
                  <Pressable
                    key={bank.id}
                    onPress={() => setSelectedBank(bank)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedBank?.id === bank.id }}
                    accessibilityLabel={bank.name}
                    style={({ pressed }) => [
                      {
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: radii.lg,
                        borderWidth: 1,
                        borderColor: selectedBank?.id === bank.id ? colors.accent : pressed ? colors.border : colors.border,
                        backgroundColor: selectedBank?.id === bank.id ? colors.accentSoft : pressed ? colors.surfaceRaised : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selectedBank?.id === bank.id ? colors.accent : colors.textMuted,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {bank.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {selectedBank && (
                <Text style={{ color: colors.accent, fontSize: 12 }}>
                  {selectedBank.code} · {selectedBank.country} · {selectedBank.currency}
                </Text>
              )}
            </View>
          </>
        ) : (
          <Banner
            tone="info"
            icon="information-circle-outline"
            message="Share these details so the sender can push money to your INVETO account. They clear the same day."
          />
        )}

        <TextField
          label="Account number"
          value={accountNumber}
          onChangeText={(next) => setAccountNumber(next.replace(/\D/g, "").slice(0, 12))}
          placeholder="8 digit account number"
          keyboardType="number-pad"
          error={accountNumber.length > 0 && !accountOk ? "Account numbers are at least 6 digits." : null}
        />

        {direction === "outbound" ? (
          <TextField
            label="Reference (optional)"
            value={reference}
            onChangeText={setReference}
            placeholder="Shows on their statement"
            maxLength={35}
            autoCapitalize="characters"
          />
        ) : null}
      </Section>

      <Section title="Amount" gap={12}>
        <TextField
          label="How much?"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
          error={amount.length > 0 && !amountOk ? "Enter an amount above zero." : null}
        />
        {quoteError ? (
          <Banner tone="danger" message={quoteError} />
        ) : null}
        <StatStrip>
          <StatTile
            label="Transfer fee"
            value={direction === "outbound" ? formatMoney(fee, currency) : "Free"}
            hint={quote ? undefined : "Enter amount and select bank"}
          />
          <StatTile
            label="Total to pay"
            value={formatMoney(total, currency)}
            tone="accent"
          />
        </StatStrip>
      </Section>

      <Button
        label="Review transfer"
        size="lg"
        disabled={!valid}
        onPress={() => {
          setReviewStartedAt(Date.now());
          setStep("review");
        }}
      />

      <Section title="Recent external transfers" gap={12}>
        {transfersApi.loading ? (
          <Card style={{ padding: 20 }}>
            <View style={{ gap: 12 }}>
              <View style={{ height: 20, backgroundColor: colors.border, borderRadius: 4 }} />
              <View style={{ height: 20, backgroundColor: colors.border, borderRadius: 4, width: "70%" }} />
            </View>
          </Card>
        ) : transfersApi.data?.length ? (
          <ListCard>
            {transfersApi.data!.slice(0, 4).map((transfer, index) => (
              <View key={transfer.id}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Ionicons
                      name={transfer.status === "completed" ? "checkmark-circle" : transfer.status === "failed" ? "close-circle" : "time-outline"}
                      size={18}
                      color={transfer.status === "completed" ? colors.accent : transfer.status === "failed" ? colors.danger : colors.textMuted}
                    />
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                      {transfer.accountName}
                    </Text>
                    <Text
                      style={{
                        color: transfer.status === "completed" ? colors.accent : transfer.status === "failed" ? colors.danger : colors.text,
                        fontSize: 15,
                        fontWeight: "700",
                      }}
                    >
                      {formatMoney(transfer.amount, currency)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 30 }}>
                    <Text style={{ color: colors.textSubtle, fontSize: 12, flex: 1 }}>
                      {transfer.bankName} · {formatRelative(transfer.createdAt)}
                    </Text>
                    <StatusChip status={transfer.status} />
                  </View>
                </View>
                {index < Math.min(transfersApi.data!.length, 4) - 1 ? (
                  <Divider inset={14} />
                ) : null}
              </View>
            ))}
          </ListCard>
        ) : (
          <EmptyState
            icon="swap-horizontal-outline"
            title="No external transfers yet"
            message="Transfers to and from other banks will show up here."
          />
        )}
      </Section>
    </Screen>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === "completed") return <Chip label="Completed" tone="success" />;
  if (status === "failed") return <Chip label="Failed" tone="danger" />;
  return <Chip label="Pending" tone="warning" />;
}