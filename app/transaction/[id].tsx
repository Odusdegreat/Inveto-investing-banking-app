import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { api } from "@/src/api/client";
import { TransactionIcon } from "@/src/components/marks";
import {
  Card,
  Chip,
  DetailRow,
  ErrorState,
  HeaderBar,
  Screen,
  Section,
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
import { downloadAndShareReceipt } from "@/src/lib/pdf";

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
      <Screen gap={22}>
        <HeaderBar title="Transaction" onBack={() => router.back()} />
        <Card style={{ padding: 20, gap: 16 }}>
          <Skeleton height={20} width="60%" />
          <Skeleton height={40} />
          <Skeleton height={16} width="80%" />
        </Card>
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Transaction" onBack={() => router.back()} />
        <ErrorState message={error ?? "Not found"} onRetry={reload} />
      </Screen>
    );
  }

  const downloadReceipt = async () => {
    await downloadAndShareReceipt(data, undefined, true);
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
    <Screen gap={22}>
      <HeaderBar title="Transaction" onBack={() => router.back()} />

      <View style={{ alignItems: "center", gap: 10, paddingVertical: 10 }}>
        <TransactionIcon kind={data.kind} category={data.category} amount={data.amount} size={68} />
        <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: "center" }}>
          {data.title}
        </Text>
        <Text
          style={{
            color: incoming ? colors.accent : colors.text,
            fontSize: 36,
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

      <Section title="Details" gap={12}>
        <Card style={{ padding: 20, gap: 2 }}>
          <DetailRow
            label="Category"
            value={CATEGORY_LABEL[data.category]}
          />
          <DetailRow label="Type" value={capitalise(data.kind)} />
          <DetailRow label="Date" value={formatDate(data.createdAt)} />
          <DetailRow label="Time" value={formatTime(data.createdAt)} />
          {data.cardLast4 ? (
            <DetailRow label="Paid with" value={`•••• ${data.cardLast4}`} />
          ) : null}
          {data.counterparty ? (
            <DetailRow label="Counterparty" value={data.counterparty} />
          ) : null}
          <DetailRow label="Reference" value={data.reference} wide />
          {data.description ? (
            <DetailRow label="Note" value={data.description} />
          ) : null}
        </Card>
      </Section>

      <View
        style={[
          styles.actions,
          { borderColor: colors.border, borderRadius: radii.lg },
        ]}
      >
        <Action
          icon="download-outline"
          label="Download receipt"
          onPress={downloadReceipt}
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

      <View style={styles.settlement}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSubtle} />
        <Text style={{ color: colors.textSubtle, fontSize: 13, lineHeight: 19, flex: 1 }}>
          Funds settle instantly for transfers and within 3 business days for
          card payments.
        </Text>
      </View>
    </Screen>
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
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 13,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = {
  actions: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    borderWidth: 1,
    paddingVertical: 18,
  },
  action: {
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 10,
    flexShrink: 1,
  },
  settlement: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 10,
  },
};
