import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { BarChart, Donut, LegendRow, Meter, StatStrip, StatTile, TextField } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  Chip,
  Divider,
  HeaderBar,
  Screen,
  Section,
  SegmentedTabs,
} from "@/src/components/ui";
import { useCurrency } from "@/src/hooks/useCurrency";
import { currencySymbol } from "@/src/lib/currency";
import { formatMoney, monthLabel } from "@/src/lib/format";
import { useBanking } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

type Period = "month" | "week";

const WEEK_SPLIT = [0.18, 0.14, 0.21, 0.16, 0.19, 0.12];
const MONTH_SPLIT = [0.14, 0.19, 0.16, 0.22, 0.15, 0.14];

export default function BudgetingScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { currency } = useCurrency();
  const budgets = useBanking((s) => s.budgets);
  const setBudgetLimit = useBanking((s) => s.setBudgetLimit);

  const [period, setPeriod] = useState<Period>("month");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const totals = useMemo(() => {
    const spent = budgets.reduce((sum, item) => sum + item.spent, 0);
    const limit = budgets.reduce((sum, item) => sum + item.limit, 0);
    return { spent, limit, ratio: limit === 0 ? 0 : spent / limit, left: limit - spent };
  }, [budgets]);

  const slices = budgets.map((item) => ({
    label: item.label,
    value: item.spent,
    color: sliceColor(item.icon, colors, item.limit === 0 ? 0 : item.spent / item.limit),
    display: formatMoney(item.spent, item.currency, { compact: true }),
  }));

  const split = period === "month" ? MONTH_SPLIT : WEEK_SPLIT;
  const spent = Math.round((totals.spent / MONTH_SPLIT.length) * 100) / 100;
  const saved = Math.round((totals.left / MONTH_SPLIT.length) * 100) / 100;

  const overBudget = budgets.filter((item) => item.spent > item.limit);
  const nearlySpent = budgets.filter(
    (item) => item.spent <= item.limit && item.spent / item.limit >= 0.8,
  );

  const startEdit = (id: string, limit: number) => {
    setEditingId(id);
    setDraft(String(limit));
  };

  const commit = (id: string) => {
    const next = Number(draft);
    if (next > 0) setBudgetLimit(id, next);
    setEditingId(null);
    setDraft("");
  };

  return (
    <Screen gap={24}>
      <HeaderBar title="Spending & budgets" onBack={() => router.back()} />

      <SegmentedTabs
        options={[
          { key: "month" as Period, label: "This month" },
          { key: "week" as Period, label: "This week" },
        ]}
        value={period}
        onChange={setPeriod}
      />

      <Card style={{ padding: 20, gap: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
          <Donut
            slices={slices}
            size={132}
            thickness={16}
            centerValue={formatMoney(totals.spent, currency, { compact: true })}
            centerLabel={`of ${formatMoney(totals.limit, currency, { compact: true })}`}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>
              {monthLabel(new Date().toISOString())}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
              {totals.left >= 0
                ? `You have ${formatMoney(totals.left, currency)} left to spend this month.`
                : `You are ${formatMoney(Math.abs(totals.left), currency)} over your total budget.`}
            </Text>
          </View>
        </View>

        <Divider />

        <StatStrip>
          <StatTile label="Spent" value={formatMoney(totals.spent, currency, { compact: true })} />
          <StatTile label="Budget" value={formatMoney(totals.limit, currency, { compact: true })} />
          <StatTile
            label="Daily average"
            value={formatMoney(spent, currency)}
            hint="Per day"
          />
          <StatTile
            label="Safe to spend"
            value={formatMoney(saved, currency)}
            tone="accent"
            hint="Per day"
          />
        </StatStrip>
      </Card>

      {overBudget.length ? (
        <Banner
          tone="danger"
          icon="alert-circle"
          message={`Over budget in ${overBudget.map((item) => item.label).join(", ")}. Tap a category to raise its limit.`}
        />
      ) : nearlySpent.length ? (
        <Banner
          tone="warning"
          icon="warning-outline"
          message={`${nearlySpent.map((item) => item.label).join(", ")} ${nearlySpent.length === 1 ? "is" : "are"} nearly used up.`}
        />
      ) : (
        <Banner
          tone="success"
          icon="checkmark-circle"
          message="Every category is inside its budget. Keep it up."
        />
      )}

      <Section title="Budget by category" gap={16}>
        {budgets.map((item) => {
          const ratio = item.limit === 0 ? 0 : item.spent / item.limit;
          const editing = editingId === item.id;
          const tone = ratio > 1 ? "danger" : ratio >= 0.8 ? "warning" : "accent";

          return (
            <Card key={item.id} style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor:
                      tone === "danger" ? colors.dangerSoft : tone === "warning" ? colors.warningSoft : colors.accentSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
                    size={18}
                    color={tone === "danger" ? colors.danger : tone === "warning" ? colors.warning : colors.accent}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>{item.label}</Text>
                  <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                    {Math.round(ratio * 100)}% of {formatMoney(item.limit, item.currency)} used
                  </Text>
                </View>
                <Text
                  style={{
                    color: tone === "danger" ? colors.danger : colors.text,
                    fontSize: 15,
                    fontWeight: "800",
                  }}
                >
                  {formatMoney(item.spent, item.currency, { compact: true })}
                </Text>
              </View>

              <Meter
                label={`${formatMoney(item.spent, item.currency)} spent`}
                detail={`${formatMoney(Math.max(item.limit - item.spent, 0), item.currency)} left`}
                ratio={ratio}
                tone={tone}
              />

              {editing ? (
                <View style={{ gap: 10 }}>
                  <TextField
                    label={`New ${item.label} limit`}
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    prefix={currencySymbol(currency)}
                  />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button
                      label="Save limit"
                      style={{ flex: 1 }}
                      onPress={() => commit(item.id)}
                    />
                    <Button
                      label="Cancel"
                      variant="secondary"
                      onPress={() => setEditingId(null)}
                    />
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => startEdit(item.id, item.limit)}
                  accessibilityRole="button"
                  accessibilityLabel={`Change ${item.label} budget`}
                  style={({ pressed }) => [
                    styles.edit,
                    {
                      borderRadius: radii.md,
                      borderColor: colors.border,
                      backgroundColor: pressed ? colors.surfaceRaised : "transparent",
                    },
                  ]}
                >
                  <Ionicons name="create-outline" size={14} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                    Change limit
                  </Text>
                </Pressable>
              )}
            </Card>
          );
        })}
      </Section>

      <Section title="Spending by day" gap={14}>
        <Card style={{ padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Chip label="Spent" tone="accent" />
            <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
              Average across the {MONTH_SPLIT.length} weeks of the month
            </Text>
          </View>
          <BarChart
            values={split.map((weight) => Math.round(spent * weight * 100) / 100)}
            labels={split.map((_, index) => `W${index + 1}`)}
            height={110}
          />
        </Card>
      </Section>

      <Section title="Where it went" gap={12}>
        <Card style={{ padding: 18 }}>
          <LegendRow slices={slices} />
        </Card>
      </Section>

      <Banner
        tone="info"
        icon="bulb-outline"
        message="Budgets roll over automatically at the start of each month. Overspending is carried into the next month so a quiet week does not hide a problem."
      />
    </Screen>
  );
}

function sliceColor(
  icon: string,
  colors: ReturnType<typeof useTheme>["colors"],
  ratio: number,
) {
  if (ratio > 1) return colors.danger;
  if (ratio >= 0.8) return colors.warning;
  const accents = [colors.accent, "#3B82F6", "#A855F7", "#0EA5E9", "#F97316", "#14B8A6"];
  let hash = 0;
  for (let i = 0; i < icon.length; i += 1) hash = (hash * 31 + icon.charCodeAt(i)) % accents.length;
  return accents[Math.abs(hash)];
}

const styles = {
  edit: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
  },
};
