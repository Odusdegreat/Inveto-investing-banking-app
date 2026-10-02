import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { ChoiceCard, ProgressBar, StatStrip, StatTile, TextField } from "@/src/components/insights";
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
import { useBanking, type SavingsGoal } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

const ICONS: { key: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "umbrella-outline", icon: "umbrella-outline" },
  { key: "airplane-outline", icon: "airplane-outline" },
  { key: "home-outline", icon: "home-outline" },
  { key: "car-sport-outline", icon: "car-sport-outline" },
  { key: "school-outline", icon: "school-outline" },
  { key: "laptop-outline", icon: "laptop-outline" },
  { key: "gift-outline", icon: "gift-outline" },
  { key: "heart-outline", icon: "heart-outline" },
];

const COLORS: { key: SavingsGoal["color"]; label: string }[] = [
  { key: "accent", label: "Green" },
  { key: "info", label: "Blue" },
  { key: "warning", label: "Amber" },
  { key: "danger", label: "Red" },
];

const DAY = 86_400_000;

export default function SavingsGoalsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { currency } = useCurrency();
  const goals = useBanking((s) => s.goals);
  const addGoal = useBanking((s) => s.addGoal);
  const contribute = useBanking((s) => s.contributeToGoal);

  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contribution, setContribution] = useState("");

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [months, setMonths] = useState("12");
  const [icon, setIcon] = useState(ICONS[0].key);
  const [color, setColor] = useState<SavingsGoal["color"]>("accent");
  const [busy, setBusy] = useState(false);

  const visible = useMemo(
    () =>
      goals.filter((goal) =>
        filter === "all" ? true : filter === "completed" ? goal.completed : !goal.completed,
      ),
    [goals, filter],
  );

  const selected = goals.find((goal) => goal.id === selectedId) ?? null;

  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.saved, 0);
  const completed = goals.filter((goal) => goal.completed).length;

  const targetValue = Number(target) || 0;
  const monthCount = Math.max(Number(months) || 1, 1);
  const valid = name.trim().length > 1 && targetValue > 0;

  const toneColor = (key: SavingsGoal["color"]) =>
    ({
      accent: colors.accent,
      info: "#3B82F6",
      warning: colors.warning,
      danger: colors.danger,
    })[key];

  const create = () => {
    if (!valid) return;
    setBusy(true);
    setTimeout(() => {
      addGoal({
        name: name.trim(),
        target: targetValue,
        currency,
        targetDate: new Date(Date.now() + monthCount * 30 * DAY).toISOString(),
        monthlyContribution: Math.round((targetValue / monthCount) * 100) / 100,
        icon,
        color,
      });
      setBusy(false);
      setCreating(false);
      setName("");
      setTarget("");
      setMonths("12");
    }, 700);
  };

  const addMoney = () => {
    if (!selected) return;
    const value = Number(contribution) || 0;
    if (value <= 0) return;
    contribute(selected.id, value);
    setContribution("");
  };

  if (creating) {
    return (
      <Screen gap={24}>
        <HeaderBar title="New savings goal" onBack={() => setCreating(false)} />

        <Section title="What are you saving for?" gap={12}>
          <TextField
            label="Goal name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Emergency fund"
            autoCapitalize="sentences"
            error={name.length > 0 && name.trim().length < 2 ? "Give your goal a name." : null}
          />
          <TextField
            label="Target amount"
            value={target}
            onChangeText={setTarget}
            placeholder="0.00"
            keyboardType="decimal-pad"
            prefix={currencySymbol(currency)}
            error={target.length > 0 && targetValue <= 0 ? "Enter a target above zero." : null}
          />
          <TextField
            label="Target date"
            value={months}
            onChangeText={(next) => setMonths(next.replace(/\D/g, "").slice(0, 3))}
            placeholder="12"
            keyboardType="number-pad"
            helper={
              targetValue > 0
                ? `Saving ${formatMoney(Math.round((targetValue / monthCount) * 100) / 100, currency)} a month gets you there in about ${monthCount} month${monthCount === 1 ? "" : "s"}.`
                : "How many months from now do you need the money?"
            }
          />
        </Section>

        <Section title="Icon" gap={12}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {ICONS.map((item) => {
              const active = icon === item.key;
              return (
                <Button
                  key={item.key}
                  label=""
                  icon={item.icon}
                  variant={active ? "primary" : "secondary"}
                  onPress={() => setIcon(item.key)}
                  style={{ minWidth: 56, paddingHorizontal: 0 }}
                />
              );
            })}
          </View>
        </Section>

        <Section title="Colour" gap={12}>
          <View style={{ gap: 10 }}>
            {COLORS.map((item) => (
              <ChoiceCard
                key={item.key}
                title={item.label}
                selected={color === item.key}
                onPress={() => setColor(item.key)}
              />
            ))}
          </View>
        </Section>

        <Button label="Create goal" size="lg" disabled={!valid} loading={busy} onPress={create} />
      </Screen>
    );
  }

  if (selected) {
    const ratio = selected.target === 0 ? 0 : selected.saved / selected.target;
    const remaining = Math.max(selected.target - selected.saved, 0);
    const accent = toneColor(selected.color);
    const contributionValue = Number(contribution) || 0;

    return (
      <Screen gap={24}>
        <HeaderBar title={selected.name} onBack={() => setSelectedId(null)} />

        <Card style={{ padding: 20, gap: 18, alignItems: "center" }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 22,
              backgroundColor: `${accent}22`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={selected.icon as React.ComponentProps<typeof Ionicons>["name"]}
              size={30}
              color={accent}
            />
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: colors.text, fontSize: 30, fontWeight: "800" }}>
              {formatMoney(selected.saved, selected.currency)}
            </Text>
            <Text style={{ color: colors.textSubtle, fontSize: 14 }}>
              of {formatMoney(selected.target, selected.currency)}
            </Text>
          </View>
          <View style={{ alignSelf: "stretch", gap: 8 }}>
            <ProgressBar value={ratio} tone={selected.completed ? "accent" : "accent"} height={10} />
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>
              {Math.round(ratio * 100)}% complete
            </Text>
          </View>
          {selected.completed ? (
            <Chip label="Goal reached" tone="success" icon="checkmark-circle" />
          ) : null}
        </Card>

        <Section title="Plan" gap={12}>
          <ListCard style={{ paddingHorizontal: 14 }}>
            <DetailRow label="Still to save" value={formatMoney(remaining, selected.currency)} />
            <Divider />
            <DetailRow label="Target date" value={formatDate(selected.targetDate)} />
            <Divider />
            <DetailRow
              label="Monthly contribution"
              value={formatMoney(selected.monthlyContribution, selected.currency)}
            />
            <Divider />
            <DetailRow
              label="On track"
              value={
                selected.monthlyContribution * monthsUntil(selected.targetDate) >= remaining
                  ? "Yes"
                  : "Needs a top-up"
              }
              valueColor={
                selected.monthlyContribution * monthsUntil(selected.targetDate) >= remaining
                  ? colors.accent
                  : colors.warning
              }
            />
          </ListCard>
        </Section>

        <Section title="Add money" gap={12}>
          <TextField
            label="Amount to add"
            value={contribution}
            onChangeText={setContribution}
            placeholder="0.00"
            keyboardType="decimal-pad"
            prefix={currencySymbol(currency)}
            error={contribution.length > 0 && contributionValue <= 0 ? "Enter an amount above zero." : null}
            helper={`Adds to this goal straight away. Contributions are instant and cannot be reversed.`}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[25, 50, 100, 250].map((amount) => (
              <Button
                key={amount}
                label={formatMoney(amount, selected.currency)}
                variant="secondary"
                onPress={() => contribute(selected.id, amount)}
                style={{ flexGrow: 1 }}
              />
            ))}
          </View>
          <Button
            label="Add to goal"
            disabled={contributionValue <= 0 || selected.completed}
            onPress={addMoney}
          />
        </Section>
      </Screen>
    );
  }

  return (
    <Screen gap={24}>
      <HeaderBar
        title="Savings goals"
        onBack={() => router.back()}
        right={<HeaderAction label="New" icon="add" onPress={() => setCreating(true)} />}
      />

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile
            label="Saved"
            value={formatMoney(totalSaved, currency, { compact: true })}
            tone="accent"
          />
          <StatTile label="Target" value={formatMoney(totalTarget, currency, { compact: true })} />
          <StatTile
            label="Reached"
            value={`${completed}/${goals.length}`}
            hint="Goals done"
          />
        </StatStrip>
      </Card>

      <SegmentedFilter
        options={[
          { key: "active" as const, label: "In progress" },
          { key: "completed" as const, label: "Reached" },
          { key: "all" as const, label: "All" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="flag-outline"
          title={filter === "completed" ? "No goals reached yet" : "No goals yet"}
          message="Name a goal, set a target date, and we will work out what you need to save each month."
          action={filter === "active" ? "Create a goal" : undefined}
          onAction={filter === "active" ? () => setCreating(true) : undefined}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {visible.map((goal) => {
            const ratio = goal.target === 0 ? 0 : goal.saved / goal.target;
            const accent = toneColor(goal.color);
            return (
              <Card key={goal.id} style={{ padding: 16, gap: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 15,
                      backgroundColor: `${accent}22`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={goal.icon as React.ComponentProps<typeof Ionicons>["name"]}
                      size={21}
                      color={accent}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                      {goal.name}
                    </Text>
                    <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                      {goal.completed
                        ? `Reached ${formatDate(goal.targetDate)}`
                        : `By ${formatDate(goal.targetDate)}`}
                    </Text>
                  </View>
                  {goal.completed ? (
                    <Chip label="Reached" tone="success" />
                  ) : (
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>
                      {Math.round(ratio * 100)}%
                    </Text>
                  )}
                </View>

                <View style={{ gap: 8 }}>
                  <ProgressBar value={ratio} tone={goal.completed ? "accent" : "accent"} height={8} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {formatMoney(goal.saved, goal.currency)} saved
                    </Text>
                    <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                      {formatMoney(Math.max(goal.target - goal.saved, 0), goal.currency)} to go
                    </Text>
                  </View>
                </View>

                <Button
                  label={goal.completed ? "View goal" : "Add money"}
                  variant={goal.completed ? "secondary" : "primary"}
                  onPress={() => setSelectedId(goal.id)}
                />
              </Card>
            );
          })}
        </View>
      )}

      <Banner
        tone="info"
        icon="repeat-outline"
        message="Link a standing order to a goal to save automatically. A weekly round-up from card spending works too."
      />
    </Screen>
  );
}

function monthsUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(Math.round(diff / (30 * DAY)), 0);
}
