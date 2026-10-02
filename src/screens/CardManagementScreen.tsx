
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";

import {
  ChoiceCard,
  ProgressBar,
  StatStrip,
  StatTile,
  TextField,
  ToggleGroup,
  ToggleRow,
} from "@/src/components/insights";
import { CardBrandMark } from "@/src/components/marks";
import {
  Banner,
  Button,
  Card,
  Chip,
  DetailRow,
  Divider,
  EmptyState,
  HeaderBar,
  HeaderAction,
  ListCard,
  Row,
  Screen,
  Section,
  SegmentedFilter,
  rowTextInset,
} from "@/src/components/ui";
import { toast } from "@/src/components/Toast";
import { api } from "@/src/api/client";
import { useApi } from "@/src/hooks/useApi";
import { useCurrency } from "@/src/hooks/useCurrency";
import { currencySymbol } from "@/src/lib/currency";
import { formatDate, formatMoney } from "@/src/lib/format";
import { useBanking } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

type Filter = "all" | "active" | "frozen";

const MERCHANT_CATEGORIES = [
  "Casino and gaming",
  "Adult entertainment",
  "Lotto and betting",
  "Cryptocurrency",
  "Charities",
  "Travel",
  "Restaurants",
  "Fuel",
];

export default function CardManagementScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { currency } = useCurrency();
  const cards = useApi(() => api.cards.list(), []);
  const controls = useBanking((s) => s.cardControls);
  const limits = useBanking((s) => s.spendingLimits);
  const setControl = useBanking((s) => s.setCardControl);
  const addLimit = useBanking((s) => s.addSpendingLimit);
  const removeLimit = useBanking((s) => s.removeSpendingLimit);

  const [filter, setFilter] = useState<Filter>("all");
  const [addingLimit, setAddingLimit] = useState(false);
  const [limitAmount, setLimitAmount] = useState("");
  const [limitPeriod, setLimitPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");

  const list = cards.data ?? [];
  const visible = list.filter((card) =>
    filter === "all" ? true : filter === "frozen" ? card.frozen : !card.frozen,
  );

  const frozenCount = list.filter((card) => card.frozen).length;
  const totalSpend = limits.reduce((sum, item) => sum + item.spent, 0);

  const limitValue = Number(limitAmount) || 0;

  const reload = async () => {
    await cards.reload();
  };

  const freezeAll = async (frozen: boolean) => {
    try {
      await api.cards.freezeAll(frozen);
      await reload();
      toast.success(frozen ? "All cards frozen." : "All cards unfrozen.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your cards.");
    }
  };

  const toggleFreeze = async (id: string, frozen: boolean) => {
    try {
      await api.cards.setFrozen(id, frozen);
      await reload();
      toast.success(frozen ? "Card frozen." : "Card unfrozen.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update that card.");
    }
  };

  const setDefault = async (id: string) => {
    try {
      await api.cards.setDefault(id);
      await reload();
      toast.success("Default card updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update that card.");
    }
  };

  const removeCard = (id: string, last4: string) => {
    Alert.alert(
      `Remove card ••${last4}?`,
      "The card stops working immediately. Any pending payments on it will be declined.",
      [
        { text: "Keep card", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.cards.remove(id);
              await reload();
              toast.success("Card removed.");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not remove that card.");
            }
          },
        },
      ],
    );
  };

  const addNewLimit = () => {
    if (limitValue <= 0 || list.length === 0) return;
    addLimit({
      label: `Card · ${list[0].last4}`,
      limit: limitValue,
      currency,
      period: limitPeriod,
    });
    setLimitAmount("");
    setAddingLimit(false);
    toast.success("Spending limit added.");
  };

  const lockedCount = useMemo(() => controls.merchantLock.length, [controls.merchantLock]);

  return (
    <Screen gap={24} onRefresh={reload} refreshing={cards.refreshing}>
      <HeaderBar
        title="Cards"
        onBack={() => router.back()}
        right={
          <HeaderAction label="Add" icon="add" onPress={() => router.push("/card-link")} />
        }
      />

      {cards.error ? (
        <Banner tone="danger" message={cards.error} />
      ) : null}

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile label="Cards" value={`${list.length}`} hint="On this account" />
          <StatTile
            label="Frozen"
            value={`${frozenCount}`}
            tone={frozenCount ? "warning" : "default"}
            hint="Blocked"
          />
          <StatTile
            label="Spent this month"
            value={formatMoney(totalSpend, currency, { compact: true })}
            tone="accent"
          />
        </StatStrip>
      </Card>

      {list.length > 0 ? (
        <Card style={{ padding: 16, gap: 12 }}>
          <ToggleRow
            title="Freeze all cards"
            subtitle={
              frozenCount === list.length
                ? "Every card is blocked right now"
                : "Instantly block every card, then unfreeze when you are ready"
            }
            icon="snow-outline"
            value={frozenCount === list.length}
            onChange={(next) => freezeAll(next)}
          />
        </Card>
      ) : null}

      <SegmentedFilter
        options={[
          { key: "all" as Filter, label: "All" },
          { key: "active" as Filter, label: "Active" },
          { key: "frozen" as Filter, label: "Frozen" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="card-outline"
          title={filter === "all" ? "No cards yet" : `No ${filter} cards`}
          message="Add a card to pay in stores, online and over the phone."
          action={filter === "all" ? "Add a card" : undefined}
          onAction={filter === "all" ? () => router.push("/card-link") : undefined}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {visible.map((card) => (
            <Card key={card.id} style={{ padding: 18, gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <CardBrandMark brand={card.brand} size="lg" />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
                    {card.label}
                  </Text>
                  <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
                    •••• {card.last4} · expires {card.expiry}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                    {card.isDefault ? <Chip label="Default" tone="accent" /> : null}
                    {card.frozen ? <Chip label="Frozen" tone="warning" /> : null}
                  </View>
                </View>
              </View>

              <ToggleRow
                title={card.frozen ? "Unfreeze card" : "Freeze card"}
                subtitle={
                  card.frozen
                    ? "Payments will be declined while frozen"
                    : "Instantly block new payments without cancelling the card"
                }
                icon={card.frozen ? "lock-open-outline" : "lock-closed-outline"}
                value={card.frozen}
                onChange={(next) => toggleFreeze(card.id, next)}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                {!card.isDefault ? (
                  <Button
                    label="Make default"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => setDefault(card.id)}
                  />
                ) : null}
                <Button
                  label="Remove"
                  variant="dangerOutline"
                  onPress={() => removeCard(card.id, card.last4)}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      <Section title="Card controls" gap={14}>
        <ToggleGroup title="Applies to every card">
          {[
            {
              key: "contactless",
              node: (
                <ToggleRow
                  title="Contactless payments"
                  subtitle="Tap to pay in shops and on transport"
                  icon="wifi-outline"
                  value={controls.contactless}
                  onChange={(next) => setControl("contactless", next)}
                />
              ),
            },
            {
              key: "online",
              node: (
                <ToggleRow
                  title="Online transactions"
                  subtitle="Card payments on websites and in apps"
                  icon="globe-outline"
                  value={controls.onlineTransactions}
                  onChange={(next) => setControl("onlineTransactions", next)}
                />
              ),
            },
            {
              key: "atm",
              node: (
                <ToggleRow
                  title="ATM withdrawals"
                  subtitle="Cash withdrawals and cash machine payments"
                  icon="cash-outline"
                  value={controls.atmWithdrawal}
                  onChange={(next) => setControl("atmWithdrawal", next)}
                />
              ),
            },
            {
              key: "international",
              node: (
                <ToggleRow
                  title="International payments"
                  subtitle="Currently off. Turn on before you travel."
                  icon="airplane-outline"
                  value={controls.international}
                  onChange={(next) => setControl("international", next)}
                />
              ),
            },
          ].map((item) => item)}
        </ToggleGroup>
      </Section>

      <Section title="Spending limits" gap={12}>
        {limits.map((limit) => {
          const ratio = limit.limit === 0 ? 0 : limit.spent / limit.limit;
          return (
            <Card key={limit.id} style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                    {limit.label}
                  </Text>
                  <Text style={{ color: colors.textSubtle, fontSize: 12, textTransform: "capitalize" }}>
                    Per {limit.period.slice(0, -1)} · {formatMoney(limit.limit, limit.currency)} cap
                  </Text>
                </View>
                <Text
                  style={{
                    color: ratio > 1 ? colors.danger : colors.text,
                    fontSize: 15,
                    fontWeight: "800",
                  }}
                >
                  {formatMoney(limit.spent, limit.currency, { compact: true })}
                </Text>
              </View>
              <ProgressBar value={ratio} tone={ratio > 1 ? "danger" : ratio > 0.8 ? "warning" : "accent"} />
              <Button
                label="Remove limit"
                variant="secondary"
                onPress={() => removeLimit(limit.id)}
              />
            </Card>
          );
        })}

        {addingLimit ? (
          <Card style={{ padding: 16, gap: 14 }}>
            <TextField
              label="Limit amount"
              value={limitAmount}
              onChangeText={setLimitAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              prefix={currencySymbol(currency)}
              error={limitAmount.length > 0 && limitValue <= 0 ? "Enter an amount above zero." : null}
            />
            <View style={{ gap: 10 }}>
              {(["daily", "weekly", "monthly"] as const).map((period) => (
                <ChoiceCard
                  key={period}
                  title={period === "daily" ? "Per day" : period === "weekly" ? "Per week" : "Per month"}
                  selected={limitPeriod === period}
                  onPress={() => setLimitPeriod(period)}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button label="Add limit" style={{ flex: 1 }} disabled={limitValue <= 0} onPress={addNewLimit} />
              <Button label="Cancel" variant="secondary" onPress={() => setAddingLimit(false)} />
            </View>
          </Card>
        ) : (
          <Button
            label="Add a spending limit"
            variant="secondary"
            icon="add"
            onPress={() => setAddingLimit(true)}
          />
        )}
      </Section>

      <Section title="Blocked merchants" gap={12}>
        <Card style={{ padding: 16, gap: 14 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            Payments to these merchant categories are declined on every card, whatever the card
            settings above say.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {MERCHANT_CATEGORIES.map((category) => {
              const locked = controls.merchantLock.includes(category);
              return (
                <Button
                  key={category}
                  label={category}
                  variant={locked ? "primary" : "secondary"}
                  onPress={() =>
                    setControl(
                      "merchantLock",
                      locked
                        ? controls.merchantLock.filter((item) => item !== category)
                        : [...controls.merchantLock, category],
                    )
                  }
                  style={{ flexGrow: 1 }}
                />
              );
            })}
          </View>
          <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
            {lockedCount} categor{lockedCount === 1 ? "y is" : "ies are"} blocked.
          </Text>
        </Card>
      </Section>

      <Section title="Card details" gap={12}>
        <ListCard style={{ paddingHorizontal: 12 }}>
          <Row title="Reveal card details" icon="eye-outline" chevron onPress={() => toast.info("Card details are shown after a PIN check.")} />
          <Divider inset={rowTextInset(20)} />
          <Row title="Replace a card" icon="refresh-outline" chevron onPress={() => router.push("/card-link")} />
          <Divider inset={rowTextInset(20)} />
          <Row title="Dispute a charge" icon="help-circle-outline" chevron onPress={() => router.push("/transactions")} />
        </ListCard>
      </Section>

      <Card style={{ padding: 16, gap: 10 }}>
        <DetailRow label="Cards added" value={formatDate(list[0]?.addedAt ?? new Date().toISOString())} />
        <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 18 }}>
          We store only the brand, last four digits, expiry and nickname. The full card number never
          reaches this device.
        </Text>
      </Card>
    </Screen>
  );
}
