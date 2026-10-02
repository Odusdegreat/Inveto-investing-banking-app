import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";

import { ChoiceCard, StatStrip, StatTile, TextField, ToggleRow } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  Chip,
  DetailRow,
  Divider,
  EmptyState,
  HeaderAction,
  HeaderBar,
  ListCard,
  Screen,
  Section,
  SegmentedFilter,
} from "@/src/components/ui";
import { useCurrency } from "@/src/hooks/useCurrency";
import { currencySymbol } from "@/src/lib/currency";
import { formatDate, formatMoney } from "@/src/lib/format";
import { CADENCE_LABEL, type Cadence, useBanking } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

const CADENCES: Cadence[] = ["weekly", "monthly", "quarterly", "yearly"];

const CADENCE_HINT: Record<Cadence, string> = {
  weekly: "Every 7 days from the day you set it up.",
  monthly: "The same day each month. Short months fall back to the last day.",
  quarterly: "Every 3 months from the day you set it up.",
  yearly: "Once a year on the same date.",
};

export default function RecurringTransfersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { currency } = useCurrency();
  const recurring = useBanking((s) => s.recurring);
  const payees = useBanking((s) => s.payees);
  const goals = useBanking((s) => s.goals);
  const addRecurring = useBanking((s) => s.addRecurring);
  const setActive = useBanking((s) => s.setRecurringActive);
  const remove = useBanking((s) => s.removeRecurring);

  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");

  const [target, setTarget] = useState<string>("");
  const [targetKind, setTargetKind] = useState<"payee" | "goal">("payee");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);

  const visible = recurring.filter((item) =>
    filter === "all" ? true : filter === "active" ? item.active : !item.active,
  );

  const value = Number(amount) || 0;
  const valid = value > 0 && target.length > 0;

  const targetLabel =
    targetKind === "payee"
      ? (payees.find((item) => item.id === target)?.name ?? "")
      : (goals.find((item) => item.id === target)?.name ?? "");

  const create = () => {
    if (!valid) return;
    setBusy(true);
    setTimeout(() => {
      addRecurring({
        name: name.trim() || targetLabel,
        to: targetLabel,
        toAccount: targetKind === "payee" ? "•••• 0000" : "Goal",
        amount: value,
        currency,
        cadence,
        nextRunAt: startDate ? new Date(startDate).toISOString() : new Date(Date.now() + 30 * 86_400_000).toISOString(),
        endAt: endDate ? new Date(endDate).toISOString() : null,
        active: true,
      });
      setBusy(false);
      setCreating(false);
      setAmount("");
      setName("");
      setTarget("");
    }, 700);
  };

  const confirmRemove = (id: string, label: string) => {
    Alert.alert(`Cancel ${label}?`, "This standing order stops immediately and cannot be resumed.", [
      { text: "Keep it", style: "cancel" },
      { text: "Cancel order", style: "destructive", onPress: () => remove(id) },
    ]);
  };

  const monthlyTotal = recurring
    .filter((item) => item.active)
    .reduce((sum, item) => {
      const factor =
        item.cadence === "weekly" ? 52 / 12 : item.cadence === "quarterly" ? 4 / 12 : item.cadence === "yearly" ? 1 / 12 : 1;
      return sum + item.amount * factor;
    }, 0);

  if (creating) {
    return (
      <Screen gap={24}>
        <HeaderBar title="New standing order" onBack={() => setCreating(false)} />

        <Section title="Send to" gap={12}>
          <SegmentedFilter
            options={[
              { key: "payee" as const, label: "Payee" },
              { key: "goal" as const, label: "Savings goal" },
            ]}
            value={targetKind}
            onChange={(next) => {
              setTargetKind(next);
              setTarget("");
            }}
          />
          <View style={{ gap: 10 }}>
            {(targetKind === "payee" ? payees : goals).map((item) => (
              <ChoiceCard
                key={item.id}
                title={item.name}
                subtitle={targetKind === "payee" ? (item as { accountNumber: string }).accountNumber : "Money into this goal"}
                icon={(item as { icon: string }).icon as React.ComponentProps<typeof Ionicons>["name"]}
                selected={target === item.id}
                onPress={() => setTarget(item.id)}
              />
            ))}
          </View>
        </Section>

        <Section title="Amount" gap={12}>
          <TextField
            label="How much each time?"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            prefix={currencySymbol(currency)}
            error={amount.length > 0 && value <= 0 ? "Enter an amount above zero." : null}
          />
          <TextField
            label="Name this order (optional)"
            value={name}
            onChangeText={setName}
            placeholder={targetLabel || "e.g. Rent"}
            autoCapitalize="sentences"
          />
        </Section>

        <Section title="How often" gap={12}>
          <View style={{ gap: 10 }}>
            {CADENCES.map((item) => (
              <ChoiceCard
                key={item}
                title={CADENCE_LABEL[item]}
                subtitle={CADENCE_HINT[item]}
                selected={cadence === item}
                onPress={() => setCadence(item)}
              />
            ))}
          </View>
        </Section>

        <Section title="Dates" gap={12}>
          <TextField
            label="First payment"
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            helper="Leave blank to start one full period from today."
          />
          <TextField
            label="Ends on (optional)"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD"
            helper="Set an end date to stop this order automatically, for example after a loan is paid off."
          />
        </Section>

        <Button label="Create standing order" size="lg" disabled={!valid} loading={busy} onPress={create} />
      </Screen>
    );
  }

  return (
    <Screen gap={24}>
      <HeaderBar
        title="Standing orders"
        onBack={() => router.back()}
        right={<HeaderAction label="New" icon="add" onPress={() => setCreating(true)} />}
      />

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile
            label="Out each month"
            value={formatMoney(monthlyTotal, currency, { compact: true })}
            tone="accent"
          />
          <StatTile
            label="Active orders"
            value={`${recurring.filter((item) => item.active).length}`}
            hint={`${recurring.filter((item) => !item.active).length} paused`}
          />
        </StatStrip>
      </Card>

      <SegmentedFilter
        options={[
          { key: "all" as const, label: "All" },
          { key: "active" as const, label: "Active" },
          { key: "paused" as const, label: "Paused" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="repeat-outline"
          title={filter === "all" ? "No standing orders" : `No ${filter} orders`}
          message="Set up a standing order for rent, subscriptions or a weekly saving habit."
          action={filter === "all" ? "Create one" : undefined}
          onAction={filter === "all" ? () => setCreating(true) : undefined}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {visible.map((item) => (
            <Card key={item.id} style={{ padding: 16, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    backgroundColor: item.active ? colors.accentSoft : colors.surfaceRaised,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="repeat-outline"
                    size={19}
                    color={item.active ? colors.accent : colors.textSubtle}
                  />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textSubtle, fontSize: 13 }} numberOfLines={1}>
                    {item.to} · {item.toAccount}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
                  {formatMoney(item.amount, item.currency)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Chip label={CADENCE_LABEL[item.cadence]} tone="neutral" />
                <Chip
                  label={item.active ? "Active" : "Paused"}
                  tone={item.active ? "success" : "warning"}
                />
                <Chip label={`${item.runsCompleted} paid`} tone="neutral" />
              </View>

              <ListCard style={{ paddingHorizontal: 14, paddingVertical: 2 }}>
                <DetailRow
                  label={item.active ? "Next payment" : "Was due"}
                  value={formatDate(item.nextRunAt)}
                  valueColor={item.active ? colors.text : colors.textSubtle}
                />
                {item.endAt ? (
                  <>
                    <Divider />
                    <DetailRow label="Ends" value={formatDate(item.endAt)} />
                  </>
                ) : null}
              </ListCard>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <ToggleRow
                    title={item.active ? "Pause" : "Resume"}
                    icon={item.active ? "pause-outline" : "play-outline"}
                    value={item.active}
                    onChange={(next) => setActive(item.id, next)}
                  />
                </View>
                <Button
                  label="Cancel"
                  variant="dangerOutline"
                  onPress={() => confirmRemove(item.id, item.name)}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      <Banner
        tone="info"
        icon="information-circle-outline"
        message="You can change the amount or date of a standing order at any time. Changes take effect from the next payment."
      />
    </Screen>
  );
}
