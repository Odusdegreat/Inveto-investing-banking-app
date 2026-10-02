import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { ChoiceCard, StatStrip, StatTile } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  HeaderBar,
  ListCard,
  Screen,
  Section,
  SegmentedFilter,
} from "@/src/components/ui";
import { toast } from "@/src/components/Toast";
import { api } from "@/src/api/client";
import { useApi } from "@/src/hooks/useApi";
import { DEFAULT_CURRENCY } from "@/src/lib/currency";
import { formatDate, formatMoney } from "@/src/lib/format";
import { exportStatement, type StatementFormat } from "@/src/lib/statement";
import { useBanking } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

type Scope = "all" | "current" | "savings";

const FORMATS: { key: StatementFormat; label: string; hint: string; icon: string }[] = [
  { key: "pdf", label: "PDF", hint: "Formatted statement, ready to print or send.", icon: "document-text-outline" },
  { key: "csv", label: "CSV", hint: "One row per transaction, for spreadsheets.", icon: "grid-outline" },
  { key: "ofx", label: "OFX", hint: "For accounting and money management software.", icon: "code-slash-outline" },
];

export default function StatementsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const statements = useBanking((s) => s.statements);
  const transactions = useApi(() => api.transactions.list(), []);

  const [format, setFormat] = useState<StatementFormat>("pdf");
  const [scope, setScope] = useState<Scope>("all");
  const [exporting, setExporting] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const active = statements[0];

  const visible = useMemo(
    () =>
      statements.filter((item) => {
        if (scope === "all") return true;
        if (scope === "savings") return item.accountName.toLowerCase().includes("savings");
        return !item.accountName.toLowerCase().includes("savings");
      }),
    [statements, scope],
  );

  const inPeriod = useMemo(() => {
    if (!active) return [];
    return (transactions.data ?? []).filter((item) => {
      const at = new Date(item.createdAt).getTime();
      return at >= new Date(active.from).getTime() && at <= new Date(active.to).getTime();
    });
  }, [transactions.data, active]);

  const runExport = () => {
    if (!active) return;
    setBusy(true);
    setExporting(active.id);
    setTimeout(() => {
      exportStatement(
        format,
        inPeriod,
        {
          accountName: active.accountName,
          from: active.from,
          to: active.to,
          openingBalance: active.openingBalance,
          closingBalance: active.closingBalance,
          currency: DEFAULT_CURRENCY,
        },
      )
        .then(() => toast.success(`${format.toUpperCase()} statement shared.`))
        .catch(() => toast.error("Could not build the statement. Try again."))
        .finally(() => {
          setBusy(false);
          setExporting(null);
        });
    }, 500);
  };

  return (
    <Screen gap={24} onRefresh={transactions.refresh} refreshing={transactions.refreshing}>
      <HeaderBar title="Statements & export" onBack={() => router.back()} />

      {transactions.error ? (
        <Banner tone="danger" message={transactions.error} />
      ) : null}

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile
            label="Latest period"
            value={active ? formatDate(active.to) : "—"}
            hint={active?.label}
          />
          <StatTile
            label="Transactions"
            value={`${inPeriod.length || (active?.transactions ?? 0)}`}
            hint="In this statement"
          />
          <StatTile
            label="Closing balance"
            value={formatMoney(active?.closingBalance ?? 0, DEFAULT_CURRENCY, { compact: true })}
            tone="accent"
          />
        </StatStrip>
      </Card>

      <Section title="Export format" gap={12}>
        {FORMATS.map((item) => (
          <ChoiceCard
            key={item.key}
            title={item.label}
            subtitle={item.hint}
            icon={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
            selected={format === item.key}
            onPress={() => setFormat(item.key)}
          />
        ))}
      </Section>

      <Button
        label={busy ? "Building your statement…" : `Export ${format.toUpperCase()}`}
        size="lg"
        icon="share-outline"
        loading={busy}
        onPress={runExport}
      />

      <Section title="Available statements" gap={12}>
        <SegmentedFilter
          options={[
            { key: "all" as const, label: "All accounts" },
            { key: "current" as const, label: "Current" },
            { key: "savings" as const, label: "Savings" },
          ]}
          value={scope}
          onChange={setScope}
        />

        {visible.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="No statements for this account"
            message="Statements are generated at the end of each month."
          />
        ) : (
          <ListCard style={{ paddingHorizontal: 14 }}>
            {visible.map((item, index) => (
              <View key={item.id}>
                <View style={{ paddingVertical: 12, gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                        {item.label}
                      </Text>
                      <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                        {item.accountName} · {item.transactions} transactions
                      </Text>
                    </View>
                    <Chip label={item.format.toUpperCase()} tone="neutral" />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12, flex: 1 }}>
                      {formatDate(item.from)} – {formatDate(item.to)}
                    </Text>
                    <Button
                      label={exporting === item.id ? "Sharing…" : "Share"}
                      variant="secondary"
                      disabled={exporting !== null}
                      loading={exporting === item.id}
                      onPress={() => {
                        setExporting(item.id);
                        exportStatement(
                          item.format,
                          inPeriod,
                          {
                            accountName: item.accountName,
                            from: item.from,
                            to: item.to,
                            openingBalance: item.openingBalance,
                            closingBalance: item.closingBalance,
                            currency: DEFAULT_CURRENCY,
                          },
                        )
                          .then(() => toast.success(`${item.label} statement shared.`))
                          .catch(() => toast.error("Could not share that statement."))
                          .finally(() => setExporting(null));
                      }}
                    />
                  </View>
                </View>
                {index < visible.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </ListCard>
        )}
      </Section>

      <Section title="Tax documents" gap={12}>
        <Card style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="calculator-outline" size={22} color={colors.accent} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                Annual tax summary
              </Text>
              <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                Interest earned and tax paid for the last calendar year
              </Text>
            </View>
            <Chip label="Ready" tone="success" />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            We issue a consolidated tax summary each January covering interest on savings and any
            investment income. Keep it for your tax return.
          </Text>
        </Card>
      </Section>

      <Banner
        tone="info"
        icon="lock-closed-outline"
        message="Statements are generated on your device and shared straight from there. We never email your transaction history."
      />
    </Screen>
  );
}
