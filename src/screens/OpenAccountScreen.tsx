import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ChoiceCard, StatStrip, StatTile, TextField } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  DetailRow,
  Divider,
  HeaderBar,
  ListCard,
  Screen,
  Section,
} from "@/src/components/ui";
import { useCurrency } from "@/src/hooks/useCurrency";
import { currencySymbol } from "@/src/lib/currency";
import { formatMoney } from "@/src/lib/format";
import { useBanking } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";

const TERMS = [
  "Deposits are protected up to the statutory limit under our deposit guarantee scheme.",
  "Interest is calculated daily and paid on the last working day of each month.",
  "You can withdraw at any time without a fee, subject to the daily limits in the app.",
  "We may ask for source of funds evidence before crediting a large opening deposit.",
];

export default function OpenAccountScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { currency } = useCurrency();
  const products = useBanking((s) => s.accountProducts);
  const openedProductId = useBanking((s) => s.openedProductId);
  const openAccount = useBanking((s) => s.openAccount);

  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [opening, setOpening] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => products.find((item) => item.id === selectedId) ?? products[0],
    [products, selectedId],
  );

  const amount = Number(opening) || 0;
  const tooSmall = amount > 0 && amount < selected.minimumOpening;
  const valid = amount >= selected.minimumOpening && agree;

  const submit = () => {
    if (!valid || !selected) return;
    setBusy(true);
    setTimeout(() => {
      openAccount(selected.id);
      setBusy(false);
    }, 700);
  };

  if (!selected) {
    return (
      <Screen gap={22}>
        <HeaderBar title="Open an account" onBack={() => router.back()} />
        <Banner tone="info" message="No account types are available right now." />
      </Screen>
    );
  }

  const openedProduct = products.find((item) => item.id === openedProductId);

  return (
    <Screen gap={24}>
      <HeaderBar title="Open an account" onBack={() => router.back()} />

      {openedProduct ? (
        <Banner
          tone="success"
          icon="checkmark-circle"
          message={`Your ${openedProduct.name} application is with us. We will email you once it is ready to use.`}
        />
      ) : null}

      <Section title="Choose an account" gap={12}>
        {products.map((product) => (
          <ChoiceCard
            key={product.id}
            title={product.name}
            subtitle={product.tagline}
            icon={product.icon as React.ComponentProps<typeof Ionicons>["name"]}
            selected={product.id === selected.id}
            onPress={() => setSelectedId(product.id)}
            badge={product.popular ? "Most popular" : product.requiresVerification ? "ID needed" : undefined}
          />
        ))}
      </Section>

      <Card style={{ padding: 18, gap: 16 }}>
        <StatStrip>
          <StatTile
            label={selected.interestRate > 0 ? "Interest rate" : "Monthly fee"}
            value={
              selected.interestRate > 0
                ? `${selected.interestRate.toFixed(2)}%`
                : formatMoney(selected.monthlyFee, currency)
            }
            hint={selected.interestRate > 0 ? "AER, variable" : "No charge"}
          />
          <StatTile
            label="Minimum opening"
            value={formatMoney(selected.minimumOpening, currency)}
            hint="One-off"
          />
        </StatStrip>

        <Divider />

        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>What&apos;s included</Text>
          {selected.features.map((feature) => (
            <View key={feature} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
              <Text style={{ color: colors.textMuted, fontSize: 14, flex: 1, lineHeight: 20 }}>
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Section title="Opening deposit" gap={12}>
        <TextField
          label="How much are you opening with?"
          value={opening}
          onChangeText={setOpening}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
          helper={
            selected.minimumOpening > 0
              ? `We need at least ${formatMoney(selected.minimumOpening, currency)} to open this account.`
              : "You can open this account with nothing and fund it later."
          }
          error={
            tooSmall
              ? `Add ${formatMoney(selected.minimumOpening - amount, currency)} to reach the minimum.`
              : null
          }
        />
        {selected.interestRate > 0 && amount >= selected.minimumOpening ? (
          <Banner
            tone="info"
            icon="trending-up-outline"
            message={`That earns about ${formatMoney((amount * selected.interestRate) / 100 / 12, currency)} of interest a month at the current rate.`}
          />
        ) : null}
      </Section>

      <Section title="Review" gap={12}>
        <ListCard style={{ paddingHorizontal: 14 }}>
          <DetailRow label="Account type" value={selected.name} />
          <Divider />
          <DetailRow label="Monthly fee" value={formatMoney(selected.monthlyFee, currency)} />
          <Divider />
          <DetailRow
            label="Interest rate"
            value={selected.interestRate > 0 ? `${selected.interestRate.toFixed(2)}% AER` : "None"}
          />
          <Divider />
          <DetailRow label="Opening deposit" value={formatMoney(amount, currency)} />
          <Divider />
          <DetailRow label="Settles" value="Within 1 business day" />
        </ListCard>
      </Section>

      <Card style={{ padding: 16, gap: 14 }}>
        <Pressable
          onPress={() => setAgree((value) => !value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agree }}
          accessibilityLabel="Accept account terms and privacy policy"
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: radii.sm,
              borderWidth: agree ? 0 : 1,
              borderColor: colors.border,
              backgroundColor: agree ? colors.accent : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {agree ? <Ionicons name="checkmark" size={15} color="#052E16" /> : null}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, flex: 1 }}>
            I have read and accept the account terms and the privacy policy.
          </Text>
        </Pressable>
        <Button
          label={busy ? "Submitting…" : "Open account"}
          size="lg"
          loading={busy}
          disabled={!valid}
          onPress={submit}
        />
      </Card>

      <View style={{ gap: 12 }}>
        <SectionHeaderLabel text="Good to know" />
        {TERMS.map((term) => (
          <View key={term} style={{ flexDirection: "row", gap: 12 }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.textSubtle,
                marginTop: 7,
              }}
            />
            <Text style={{ color: colors.textSubtle, fontSize: 13, lineHeight: 19, flex: 1 }}>
              {term}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function SectionHeaderLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {text}
    </Text>
  );
}
