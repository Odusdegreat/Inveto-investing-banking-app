import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";

import { api } from "@/src/api/client";
import { toast } from "@/src/components/Toast";
import {
  Button,
  Card,
  Chip,
  DetailRow,
  Divider,
  ErrorState,
  HeaderBar,
  IconBadge,
  Screen,
  Section,
  Skeleton,
} from "@/src/components/ui";
import { formatDate, formatMoney } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { SandboxTransfer, TransferReceipt } from "@/src/types";

const STATUS_COLOR: Record<string, string> = {
  completed: "accent",
  pending: "warning",
  failed: "danger",
  reversed: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
  reversed: "Reversed",
};

export default function TransferDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const transferId = params.id;

  const [transfer, setTransfer] = useState<SandboxTransfer | null>(null);
  const [receipt, setReceipt] = useState<TransferReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transferId) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [transferData, receiptData] = await Promise.all([
          api.transfers.get(transferId),
          api.transfers.receipt(transferId).catch(() => null),
        ]);
        setTransfer(transferData);
        setReceipt(receiptData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transfer");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [transferId]);

  const share = async () => {
    if (!transfer || !receipt) return;
    try {
      await Share.share({
        title: "Transfer Receipt",
        message: `INVETO Transfer Receipt\n\nReference: ${receipt.reference}\nAmount: ${formatMoney(receipt.amount, receipt.currency)}\nFee: ${formatMoney(receipt.fee, receipt.currency)}\nStatus: ${STATUS_LABEL[transfer.status] || transfer.status}\nDate: ${formatDate(transfer.createdAt)}\nFrom: ${transfer.fromAccountId}\nTo: ${transfer.recipientAccountId}`,
      });
    } catch {
      toast.error("Could not open the share sheet.");
    }
  };

  if (loading) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Transfer Details" onBack={() => router.back()} />
        <Card style={{ padding: 22, gap: 18 }}>
          <Skeleton height={22} width="45%" />
          <Skeleton height={56} />
          <Skeleton height={22} width="70%" />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Transfer Details" onBack={() => router.back()} />
        <ErrorState message={error} onRetry={() => router.replace({ pathname: "/transfer", params: { id: transferId } })} />
      </Screen>
    );
  }

  if (!transfer) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Transfer Details" onBack={() => router.back()} />
        <Card style={{ padding: 22 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>
            Transfer not found.
          </Text>
        </Card>
      </Screen>
    );
  }

  const statusTone = STATUS_COLOR[transfer.status] ?? "neutral";
  const statusLabel = STATUS_LABEL[transfer.status] ?? transfer.status;

  return (
    <Screen gap={24}>
      <HeaderBar title="Transfer Details" onBack={() => router.back()} />

      <Card style={{ padding: 20, gap: 16 }}>
        <View style={styles.headerRow}>
          <View style={styles.statusContainer}>
            <Chip label={statusLabel} tone={statusTone as any} />
          </View>
          <View style={styles.referenceContainer}>
            <Text style={{ color: colors.textSubtle, fontSize: 12 }}>Reference</Text>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700", fontFamily: "monospace" }}>
              {transfer.reference}
            </Text>
          </View>
        </View>

        <Divider />

        <DetailRow
          label="Amount"
          value={formatMoney(transfer.amount, transfer.currency)}
          valueColor={transfer.amount > 0 ? colors.accent : colors.danger}
        />
        <Divider />
        <DetailRow label="Fee" value={formatMoney(transfer.fee, transfer.currency)} />
        <Divider />
        <DetailRow
          label="Total"
          value={formatMoney(transfer.amount + transfer.fee, transfer.currency)}
        />
        <Divider />
        <DetailRow label="Currency" value={transfer.currency} />
        <Divider />
        <DetailRow label="Note" value={transfer.note || "—"} />
        <Divider />
        <DetailRow label="Date" value={formatDate(transfer.createdAt)} />
      </Card>

      <Section title="Accounts" gap={12}>
        <Card style={{ padding: 16, gap: 12 }}>
          <View style={styles.accountCard}>
            <View style={styles.accountIcon}>
              <Ionicons name="arrow-down-outline" size={20} color={colors.danger} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={{ color: colors.textSubtle, fontSize: 12 }}>From</Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
                {transfer.fromAccountId}
              </Text>
            </View>
          </View>
          <Divider style={{ marginHorizontal: -16 }} />
          <View style={styles.accountCard}>
            <View style={styles.accountIcon}>
              <Ionicons name="arrow-up-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.accountInfo}>
              <Text style={{ color: colors.textSubtle, fontSize: 12 }}>To</Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
                {transfer.recipientAccountId}
              </Text>
            </View>
          </View>
        </Card>
      </Section>

      {receipt && (
        <Section title="Receipt" gap={12}>
          <Card style={{ padding: 16, gap: 12 }}>
            <View style={styles.receiptRow}>
              <IconBadge icon="receipt-outline" tone="accent" />
              <View style={styles.receiptInfo}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>Official Receipt</Text>
                <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
                  Reference: {receipt.reference}
                </Text>
              </View>
            </View>
            <Divider />
            <DetailRow label="Beneficiary" value={receipt.beneficiaryName} />
            <Divider />
            <DetailRow label="From Account" value={receipt.fromAccountId} />
            <Divider />
            <DetailRow label="Created" value={formatDate(receipt.createdAt)} />
          </Card>
        </Section>
      )}

      <Section gap={12}>
        <Button label="Share Receipt" icon="share-outline" size="lg" onPress={share} />
      </Section>

      <Card style={styles.notice}>
        <Ionicons name="shield-checkmark-outline" size={19} color={colors.accent} />
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, flex: 1 }}>
          This is a sandbox transfer for testing purposes. No real money was moved.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusContainer: {
    flex: 1,
  },
  referenceContainer: {
    alignItems: "flex-end",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  accountInfo: {
    gap: 2,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  receiptInfo: {
    gap: 2,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 18,
  },
});