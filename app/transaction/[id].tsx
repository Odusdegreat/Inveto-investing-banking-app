import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";

import { api } from "@/src/api/client";
import { TransactionIcon } from "@/src/components/marks";
import {
  Card,
  Chip,
  ErrorState,
  HeaderBar,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  formatDate,
  formatMoney,
  formatTime,
} from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";

const STATUS_TONE = {
  completed: "success",
  pending: "warning",
  failed: "danger",
  reversed: "neutral",
} as const;

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { data, loading, error, reload } = useApi(
    () => api.transactions.get(String(id)),
    [id],
  );
  const [reported, setReported] = useState(false);

  if (loading) {
    return (
      <Screen>
        <HeaderBar title="Transaction" onBack={() => router.back()} />
        <Card style={{ padding: 20, gap: 14 }}>
          <Skeleton height={20} width="60%" />
          <Skeleton height={40} />
          <Skeleton height={14} />
        </Card>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <HeaderBar title="Transaction" onBack={() => router.back()} />
        <ErrorState message={error ?? "Not found"} onRetry={reload} />
      </Screen>
    );
  }

  const shareReceipt = async () => {
    await Share.share({
      title: "INVETO receipt",
      message: [
        "INVETO receipt",
        `Reference: ${data.reference}`,
        `Amount: ${formatMoney(data.amount, data.currency, { sign: true })}`,
        `Description: ${data.title}`,
        `Category: ${CATEGORY_LABEL[data.category]}`,
        `Date: ${formatDate(data.createdAt)} ${formatTime(data.createdAt)}`,
        `Status: ${STATUS_LABEL[data.status]}`,
      ].join("\n"),
    }).catch(() => undefined);
  };

  const report = () => {
    Alert.alert(
      "Report a problem",
      "Tell us what went wrong with this transaction.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I do not recognise this",
          onPress: async () => {
            await api.transactions
              .report(data.id, "not_recognised")
              .catch(() => undefined);
            setReported(true);
          },
        },
        {
          text: "Amount looks wrong",
          onPress: async () => {
            await api.transactions.report(data.id, "wrong_amount").catch(() => undefined);
            setReported(true);
          },
        },
      ],
    );
  };

  const incoming = data.amount > 0;

  return (
    <Screen>
      <HeaderBar title="Transaction" onBack={() => router.back()} />

      <View style={{ alignItems: "center", gap: 10, paddingVertical: 12 }}>
        <TransactionIcon kind={data.kind} category={data.category} size={64} />
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>
          {data.title}
        </Text>
        <Text
          style={{
            color: incoming ? colors.accent : colors.text,
            fontSize: 34,
            fontWeight: "800",
          }}
        >
          {formatMoney(data.amount, data.currency, { sign: true })}
        </Text>
        <Chip
          label={STATUS_LABEL[data.status]}
          tone={STATUS_TONE[data.status]}
        />
      </View>

      <Card style={{ padding: 18, marginTop: 20 }}>
        <SectionHeader title="Details" />
        <Detail label="Category" value={CATEGORY_LABEL[data.category]} />
        <Detail label="Type" value={capitalise(data.kind)} />
        <Detail label="Date" value={formatDate(data.createdAt)} />
        <Detail label="Time" value={formatTime(data.createdAt)} />
        {data.cardLast4 ? (
          <Detail label="Paid with" value={`•••• ${data.cardLast4}`} />
        ) : null}
        {data.counterparty ? (
          <Detail label="Counterparty" value={data.counterparty} />
        ) : null}
        <Detail label="Reference" value={data.reference} mono />
        {data.description ? (
          <Detail label="Note" value={data.description} />
        ) : null}
      </Card>

      <View
        style={[
          styles.actions,
          { borderColor: colors.border, borderRadius: radii.lg },
        ]}
      >
        <Action
          icon="download-outline"
          label="Download receipt"
          onPress={shareReceipt}
        />
        <Action
          icon="repeat-outline"
          label="Send again"
          onPress={() => router.push("/transfer")}
        />
        <Action
          icon="flag-outline"
          label={reported ? "Reported" : "Report a problem"}
          onPress={report}
        />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 }}>
        <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSubtle} />
        <Text style={{ color: colors.textSubtle, fontSize: 12, flex: 1 }}>
          Funds settle instantly for transfers and within 3 business days for
          card payments.
        </Text>
      </View>
    </Screen>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.detail}>
      <Text style={{ color: colors.textSubtle, fontSize: 13 }}>{label}</Text>
      <Text
        style={{
          color: colors.text,
          fontSize: 14,
          fontWeight: "600",
          fontFamily: mono ? "monospace" : undefined,
          flexShrink: 1,
          textAlign: "right",
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.action}
    >
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = {
  detail: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    gap: 16,
    paddingVertical: 9,
  },
  actions: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    borderWidth: 1,
    marginTop: 20,
    paddingVertical: 14,
  },
  action: {
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 8,
  },
};
