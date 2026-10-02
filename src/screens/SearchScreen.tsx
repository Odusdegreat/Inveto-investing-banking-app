import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import { Card, Chip, Divider, HeaderBar, Screen } from "@/src/components/ui";
import { api } from "@/src/api/client";
import { useApi } from "@/src/hooks/useApi";
import { useCurrency } from "@/src/hooks/useCurrency";
import { formatMoney, formatRelative } from "@/src/lib/format";
import { useBanking } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

type Scope = "all" | "transactions" | "people" | "goals" | "settings";

const SCOPES: { key: Scope; label: string; icon: string }[] = [
  { key: "all", label: "Everything", icon: "apps-outline" },
  { key: "transactions", label: "Transactions", icon: "receipt-outline" },
  { key: "people", label: "People", icon: "people-outline" },
  { key: "goals", label: "Goals", icon: "flag-outline" },
  { key: "settings", label: "Settings", icon: "options-outline" },
];

type Result = {
  id: string;
  title: string;
  subtitle: string;
  scope: Exclude<Scope, "all">;
  icon: string;
  href: string;
  meta?: string;
};

const SETTINGS_INDEX: Result[] = [
  { id: "s1", title: "Accounts", subtitle: "Balances, numbers and interest rates", scope: "settings", icon: "wallet-outline", href: "/accounts" },
  { id: "s2", title: "Cards", subtitle: "Freeze, limits and blocked merchants", scope: "settings", icon: "card-outline", href: "/cards" },
  { id: "s3", title: "Standing orders", subtitle: "Automate regular payments", scope: "settings", icon: "repeat-outline", href: "/recurring-transfers" },
  { id: "s4", title: "Bills and payees", subtitle: "Pay bills and manage autopay", scope: "settings", icon: "receipt-outline", href: "/bills" },
  { id: "s5", title: "Budgets", subtitle: "Limits by spending category", scope: "settings", icon: "pie-chart-outline", href: "/budgeting" },
  { id: "s6", title: "Savings goals", subtitle: "Track progress towards a target", scope: "settings", icon: "flag-outline", href: "/savings-goals" },
  { id: "s7", title: "Verification", subtitle: "Your tier and outstanding checks", scope: "settings", icon: "shield-checkmark-outline", href: "/verification" },
  { id: "s8", title: "Security", subtitle: "PIN, two-factor and devices", scope: "settings", icon: "lock-closed-outline", href: "/securitysettings" },
  { id: "s9", title: "Statements and export", subtitle: "Download PDF, CSV or OFX", scope: "settings", icon: "document-text-outline", href: "/statements" },
  { id: "s10", title: "Advanced settings", subtitle: "Privacy, alerts and app behaviour", scope: "settings", icon: "options-outline", href: "/settings-advanced" },
  { id: "s11", title: "Borrowing", subtitle: "Loans, salary advances and credit", scope: "settings", icon: "cash-outline", href: "/loans" },
  { id: "s12", title: "Refer a friend", subtitle: "Earn for every invite", scope: "settings", icon: "gift-outline", href: "/referral" },
  { id: "s13", title: "Support tickets", subtitle: "Raise and track a request", scope: "settings", icon: "chatbubbles-outline", href: "/tickets" },
  { id: "s14", title: "Open an account", subtitle: "Savings, current or fixed deposit", scope: "settings", icon: "add-circle-outline", href: "/open-account" },
  { id: "s15", title: "External transfer", subtitle: "Send or request money from a bank", scope: "settings", icon: "swap-horizontal-outline", href: "/external-transfer" },
  { id: "s16", title: "Portfolio analytics", subtitle: "Allocation, yield and costs", scope: "settings", icon: "analytics-outline", href: "/portfolio-analytics" },
  { id: "s17", title: "Take the tour", subtitle: "A quick walkthrough of the app", scope: "settings", icon: "school-outline", href: "/onboarding" },
];

const SUGGESTIONS = [
  "card frozen",
  "standing order",
  "verification",
  "water bill",
  "savings goal",
  "statement",
  "transfer limit",
];

export default function SearchScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { currency } = useCurrency();
  const transactions = useApi(() => api.transactions.list(), []);
  const beneficiaries = useApi(() => api.beneficiaries.list(), []);
  const payees = useBanking((s) => s.payees);
  const goals = useBanking((s) => s.goals);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const people = useMemo<Result[]>(
    () => [
      ...(beneficiaries.data ?? []).map((item) => ({
        id: `b-${item.id}`,
        title: item.name,
        subtitle: `${item.bank} · •••• ${item.accountNumber.slice(-4)}`,
        scope: "people" as const,
        icon: "person-outline",
        href: "/beneficiaries",
        meta: "Beneficiary",
      })),
      ...payees.map((item) => ({
        id: `p-${item.id}`,
        title: item.name,
        subtitle: `${item.accountNumber} · ${item.autopayEnabled ? "Autopay on" : "Manual"}`,
        scope: "people" as const,
        icon: item.icon,
        href: "/bills",
        meta: "Payee",
      })),
    ],
    [beneficiaries.data, payees],
  );

  const money = useMemo<Result[]>(
    () =>
      (transactions.data ?? []).map((item) => ({
        id: `t-${item.id}`,
        title: item.description || item.title,
        subtitle: `${formatMoney(item.amount, item.currency, { sign: item.amount > 0 })} · ${item.reference}`,
        scope: "transactions" as const,
        icon: "receipt-outline",
        href: `/transaction/${encodeURIComponent(item.id)}`,
        meta: formatRelative(item.createdAt),
      })),
    [transactions.data],
  );

  const goalResults = useMemo<Result[]>(
    () =>
      goals.map((item) => ({
        id: `g-${item.id}`,
        title: item.name,
        subtitle: `${formatMoney(item.saved, currency, { compact: true })} of ${formatMoney(item.target, currency, { compact: true })} saved`,
        scope: "goals" as const,
        icon: item.icon,
        href: "/savings-goals",
        meta: item.completed ? "Complete" : "In progress",
      })),
    [goals, currency],
  );

  const everything = useMemo<Result[]>(
    () => [...money, ...people, ...goalResults, ...SETTINGS_INDEX],
    [money, people, goalResults],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return everything
      .filter((item) => scope === "all" || item.scope === scope)
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          (item.meta ?? "").toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [everything, query, scope]);

  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    for (const item of results) {
      map.set(item.scope, [...(map.get(item.scope) ?? []), item]);
    }
    return [...map.entries()];
  }, [results]);

  const SCOPE_LABEL: Record<Exclude<Scope, "all">, string> = {
    transactions: "Transactions",
    people: "People and payees",
    goals: "Savings goals",
    settings: "In the app",
  };

  const go = (href: string) => router.push(href as never);

  return (
    <Screen gap={20}>
      <HeaderBar title="Search" onBack={() => router.back()} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          minHeight: 50,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
        }}
      >
        <Ionicons name="search" size={18} color={colors.textSubtle} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search transactions, people, settings"
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel="Search"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{ flex: 1, color: colors.text, fontSize: 15, minHeight: 48 }}
        />
        {query ? (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </View>

      {query.trim() ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SCOPES.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setScope(item.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: scope === item.key }}
              accessibilityLabel={item.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 9,
                paddingHorizontal: 13,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: scope === item.key ? colors.accent : colors.border,
                backgroundColor: scope === item.key ? colors.accentSoft : "transparent",
              }}
            >
              <Ionicons
                name={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
                size={13}
                color={scope === item.key ? colors.accent : colors.textMuted}
              />
              <Text
                style={{
                  color: scope === item.key ? colors.accent : colors.textMuted,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Try searching for
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {SUGGESTIONS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setQuery(item)}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${item}`}
                style={{
                  paddingVertical: 9,
                  paddingHorizontal: 14,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {query.trim() && results.length === 0 ? (
        <Card style={{ padding: 28, alignItems: "center", gap: 10 }}>
          <Ionicons name="search-outline" size={28} color={colors.textSubtle} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            No results for “{query.trim()}”
          </Text>
          <Text style={{ color: colors.textSubtle, fontSize: 13, textAlign: "center", lineHeight: 19 }}>
            Try a shorter word, or search a different scope. We search transaction descriptions,
            names and every setting in the app.
          </Text>
        </Card>
      ) : null}

      {results.length > 0 ? (
        <View style={{ gap: 20 }}>
          <Text style={{ color: colors.textSubtle, fontSize: 13 }}>
            {results.length} result{results.length === 1 ? "" : "s"}
          </Text>
          {grouped.map(([key, items]) => (
            <View key={key} style={{ gap: 10 }}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 12,
                  fontWeight: "700",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                {SCOPE_LABEL[key as Exclude<Scope, "all">]}
              </Text>
              <Card style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                {items.map((item, index) => (
                  <View key={item.id}>
                    <Pressable
                      onPress={() => go(item.href)}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title}. ${item.subtitle}`}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 2,
                        borderRadius: 10,
                        backgroundColor: pressed ? colors.surfaceRaised : "transparent",
                      })}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 11,
                          backgroundColor: colors.surfaceRaised,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name={item.icon as React.ComponentProps<typeof Ionicons>["name"]}
                          size={16}
                          color={colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ color: colors.textSubtle, fontSize: 12 }} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      </View>
                      {item.meta ? <Chip label={item.meta} tone="neutral" /> : null}
                      <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
                    </Pressable>
                    {index < items.length - 1 ? <Divider /> : null}
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </View>
      ) : null}

      {!query.trim() ? (
        <Text
          style={{
            color: colors.textSubtle,
            fontSize: 12,
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          Search covers {transactions.data?.length ?? 0} transactions, {people.length} people and
          payees, {goals.length} savings goals and {SETTINGS_INDEX.length} places in the app.
          {Platform.OS === "ios" ? " Pull down to search as you type." : ""}
        </Text>
      ) : null}
    </Screen>
  );
}
