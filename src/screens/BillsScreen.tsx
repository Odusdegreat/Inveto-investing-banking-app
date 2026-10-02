import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { ChoiceCard, StatStrip, StatTile, TextField, ToggleRow } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  Chip,
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

import { dayLabel, formatDate, formatMoney } from "@/src/lib/format";
import { useBanking, type Payee } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

type Filter = "due" | "scheduled" | "paid";
type PayeeCategory = Payee["category"];

const CATEGORIES: { key: PayeeCategory; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "utilities", label: "Utilities", icon: "flash-outline" },
  { key: "housing", label: "Housing", icon: "home-outline" },
  { key: "lifestyle", label: "Lifestyle", icon: "sparkles-outline" },
  { key: "insurance", label: "Insurance", icon: "shield-checkmark-outline" },
  { key: "education", label: "Education", icon: "school-outline" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal" },
];

export default function BillsScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { currency } = useCurrency();
  const bills = useBanking((s) => s.bills);
  const payees = useBanking((s) => s.payees);
  const payBill = useBanking((s) => s.payBill);
  const setAutopay = useBanking((s) => s.setAutopay);
  const addPayee = useBanking((s) => s.addPayee);

  const [filter, setFilter] = useState<Filter>("due");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [category, setCategory] = useState<PayeeCategory>("utilities");
  const [busy, setBusy] = useState(false);

  const payeeFor = (id: string) => payees.find((item) => item.id === id);

  const grouped = useMemo(() => {
    const scoped = bills.filter((bill) =>
      filter === "paid" ? bill.status === "paid" : filter === "due" ? bill.status === "due" || bill.status === "overdue" : bill.status === "scheduled",
    );
    return [...scoped].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }, [bills, filter]);

  const due = bills.filter((bill) => bill.status === "due" || bill.status === "overdue");
  const overdue = bills.filter((bill) => bill.status === "overdue");
  const dueTotal = due.reduce((sum, bill) => sum + bill.amount, 0);
  const autopayTotal = bills
    .filter((bill) => bill.status === "scheduled")
    .reduce((sum, bill) => sum + bill.amount, 0);

  const digits = accountNumber.replace(/\D/g, "");
  const valid = name.trim().length > 1 && digits.length >= 6;

  const create = () => {
    if (!valid) return;
    setBusy(true);
    setTimeout(() => {
      addPayee({
        name: name.trim(),
        category,
        accountNumber: `•••• ${digits.slice(-4)}`,
        autopayEnabled: false,
        icon: CATEGORIES.find((item) => item.key === category)?.icon ?? "card-outline",
      });
      setBusy(false);
      setAdding(false);
      setName("");
      setAccountNumber("");
    }, 700);
  };

  if (adding) {
    return (
      <Screen gap={24}>
        <HeaderBar title="Add a payee" onBack={() => setAdding(false)} />

        <Section title="Payee details" gap={12}>
          <TextField
            label="Company or person"
            value={name}
            onChangeText={setName}
            placeholder="As it appears on the bill"
            autoCapitalize="words"
            error={name.length > 0 && name.trim().length < 2 ? "Enter the full name." : null}
          />
          <TextField
            label="Account number"
            value={accountNumber}
            onChangeText={(next) => setAccountNumber(next.replace(/\D/g, "").slice(0, 12))}
            placeholder="From the bill"
            keyboardType="number-pad"
            error={accountNumber.length > 0 && digits.length < 6 ? "Account numbers are at least 6 digits." : null}
          />
        </Section>

        <Section title="Category" gap={12}>
          <View style={{ gap: 10 }}>
            {CATEGORIES.map((item) => (
              <ChoiceCard
                key={item.key}
                title={item.label}
                icon={item.icon}
                selected={category === item.key}
                onPress={() => setCategory(item.key)}
              />
            ))}
          </View>
        </Section>

        <Banner
          tone="info"
          icon="lock-closed-outline"
          message="We only keep the last four digits of a payee account number. The full number is tokenised by our payment partner."
        />

        <Button label="Add payee" size="lg" disabled={!valid} loading={busy} onPress={create} />
      </Screen>
    );
  }

  return (
    <Screen gap={24}>
      <HeaderBar
        title="Bills & payments"
        onBack={() => router.back()}
        right={<HeaderAction label="Payee" icon="person-add-outline" onPress={() => setAdding(true)} />}
      />

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile
            label="Due now"
            value={formatMoney(dueTotal, currency)}
            tone={overdue.length ? "danger" : "default"}
            hint={`${due.length} bill${due.length === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Scheduled"
            value={formatMoney(autopayTotal, currency, { compact: true })}
            hint="On autopay"
          />
          <StatTile
            label="Overdue"
            value={`${overdue.length}`}
            tone={overdue.length ? "danger" : "default"}
            hint="Needs action"
          />
        </StatStrip>
      </Card>

      {overdue.length ? (
        <Banner
          tone="danger"
          icon="alert-circle"
          message={`${overdue.length} bill${overdue.length === 1 ? " is" : "s are"} overdue. Late payment fees may apply.`}
        />
      ) : null}

      <SegmentedFilter
        options={[
          { key: "due" as Filter, label: "Due" },
          { key: "scheduled" as Filter, label: "Scheduled" },
          { key: "paid" as Filter, label: "Paid" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {grouped.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={filter === "paid" ? "Nothing paid yet" : "Nothing due"}
          message={
            filter === "paid"
              ? "Bills you pay will be listed here with their receipts."
              : "You are all caught up. New bills appear here as they are issued."
          }
        />
      ) : (
        <View style={{ gap: 12 }}>
          {grouped.map((bill) => {
            const payee = payeeFor(bill.payeeId);
            return (
              <Card key={bill.id} style={{ padding: 16, gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 13,
                      backgroundColor:
                        bill.status === "overdue"
                          ? colors.dangerSoft
                          : bill.status === "paid"
                            ? colors.surfaceRaised
                            : colors.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={(payee?.icon ?? "receipt-outline") as React.ComponentProps<typeof Ionicons>["name"]}
                      size={19}
                      color={
                        bill.status === "overdue"
                          ? colors.danger
                          : bill.status === "paid"
                            ? colors.textSubtle
                            : colors.accent
                      }
                    />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                      {bill.title}
                    </Text>
                    <Text style={{ color: colors.textSubtle, fontSize: 13 }} numberOfLines={1}>
                      {payee?.name ?? "Unknown payee"} · {bill.reference}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
                      {formatMoney(bill.amount, bill.currency)}
                    </Text>
                    <BillChip status={bill.status} />
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSubtle} />
                  <Text style={{ color: colors.textSubtle, fontSize: 12, flex: 1 }}>
                    {bill.status === "paid" && bill.paidAt
                      ? `Paid ${dayLabel(bill.paidAt)}`
                      : `Due ${formatDate(bill.dueAt)}`}
                  </Text>
                </View>

                {bill.status !== "paid" ? (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button
                      label="Pay now"
                      style={{ flex: 1 }}
                      onPress={() => payBill(bill.id)}
                    />
                    <View
                      style={{
                        borderRadius: radii.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                        justifyContent: "center",
                        paddingHorizontal: 8,
                      }}
                    >
                      <ToggleRow
                        title="Autopay"
                        value={Boolean(payee?.autopayEnabled)}
                        onChange={(next) => payee && setAutopay(payee.id, next)}
                      />
                    </View>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}

      <Section title="Your payees" gap={12}>
        <ListCard>
          {payees.map((payee, index) => (
            <View key={payee.id}>
              <ToggleRow
                title={payee.name}
                subtitle={`${payee.accountNumber} · ${payee.autopayEnabled ? "Autopay on" : "Manual"}`}
                icon={payee.icon as React.ComponentProps<typeof Ionicons>["name"]}
                value={payee.autopayEnabled}
                onChange={(next) => setAutopay(payee.id, next)}
              />
              {index < payees.length - 1 ? <Divider inset={38} /> : null}
            </View>
          ))}
        </ListCard>
      </Section>

      <Text style={{ color: colors.textSubtle, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
        Autopay pays a bill one day before it is due. Turn it off at any time and nothing further is taken.
      </Text>
    </Screen>
  );
}

function BillChip({ status }: { status: string }) {
  if (status === "paid") return <Chip label="Paid" tone="success" />;
  if (status === "overdue") return <Chip label="Overdue" tone="danger" />;
  if (status === "scheduled") return <Chip label="Scheduled" tone="accent" />;
  return <Chip label="Due" tone="warning" />;
}
