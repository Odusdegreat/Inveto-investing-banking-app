import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Switch, Text, View, StyleSheet } from "react-native";
import { api } from "@/src/api/client";
import { Field } from "@/src/components/AuthShell";
import { CardBrandMark } from "@/src/components/marks";
import {
  Banner,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  HeaderBar,
  ListCard,
  Row,
  Screen,
  Section,
  SectionHeader,
  Skeleton,
  Stack,
} from "@/src/components/ui";
import { errorMessage, toast } from "@/src/components/Toast";
import { useApi } from "@/src/hooks/useApi";
import { useSession } from "@/src/store/session";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { CardBrand, PaymentCard } from "@/src/types";

const BRANDS: CardBrand[] = ["visa", "mastercard", "amex", "paystack", "bank"];
export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const cards = useApi(() => api.cards.list(), []);
  const user = useSession((state) => state.user);
  const [adding, setAdding] = useState(false);
  const [brand, setBrand] = useState<CardBrand>("visa");
  const [label, setLabel] = useState("");
  const [last4, setLast4] = useState("");
  const [expiry, setExpiry] = useState("");
  const [removing, setRemoving] = useState<PaymentCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const valid = /^\d{4}$/.test(last4) && /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) && label.trim().length > 0;
  const mutate = async (action: () => Promise<unknown>, message: string) => {
    if (busy) return false;
    setBusy(true);
    setFailure(null);
    try {
      await action();
      toast.success(message);
      await cards.reload();
      return true;
    } catch (error) {
      const message = errorMessage(error);
      setFailure(message);
      toast.error(message);
      return false;
    } finally { setBusy(false); }
  };
  const add = async () => {
    if (!valid) return;
    if (await mutate(() => api.cards.add({ brand, label: label.trim(), last4, expiry, holder: user?.fullName ?? "" }), "Test card saved.")) {
      setAdding(false); setLabel(""); setLast4(""); setExpiry("");
    }
  };
  return (
    <Screen
      gap={22}
      onRefresh={cards.refresh}
      refreshing={cards.refreshing}
    >
      <HeaderBar title="Payment methods" onBack={() => router.back()} />

      <Stack gap={12}>
        <Button
          label="Link a card with Paystack"
          icon="card-outline"
          onPress={() => router.push("/card-link")}
        />
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
          Use hosted checkout to link a test card. Full card details are entered
          with Paystack.
        </Text>
      </Stack>

      {failure ? <Banner tone="danger" message={failure} /> : null}
      {cards.error ? (
        <ErrorState message={cards.error} onRetry={cards.reload} />
      ) : null}

      {removing ? (
        <Card style={{ padding: 20, gap: 14 }}>
          <SectionHeader title={`Remove ${removing.label}?`} />
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
            Card ending {removing.last4} will be removed from your account.
          </Text>
          <Button label="Remove card" variant="danger" loading={busy} onPress={async () => { if (await mutate(() => api.cards.remove(removing.id), "Card removed.")) setRemoving(null); }} />
          <Button label="Keep card" variant="ghost" disabled={busy} onPress={() => setRemoving(null)} />
        </Card>
      ) : null}

      <Section title={`${cards.data?.length ?? 0} cards`} gap={12}>
        {cards.loading && !cards.data ? (
          <Card style={{ padding: 20, gap: 18 }}>
            <Skeleton height={44} />
            <Skeleton height={44} width="75%" />
          </Card>
        ) : cards.data?.length ? (
          <Stack gap={12}>
            {cards.data.map((card) => (
              <Card key={card.id} style={{ padding: 20, gap: 14 }}>
                <Row
                  title={card.label}
                  subtitle={`•••• ${card.last4} · ${card.expiry}${card.isDefault ? " · Default" : ""}`}
                  left={<CardBrandMark brand={card.brand} size="sm" />}
                />
                <Divider />
                <Row
                  title={card.frozen ? "Card frozen" : "Card active"}
                  right={
                    <Switch
                      accessibilityLabel={`Freeze ${card.label}`}
                      value={card.frozen}
                      disabled={busy}
                      onValueChange={(frozen) => {
                        void mutate(
                          () => api.cards.setFrozen(card.id, frozen),
                          frozen ? "Card frozen." : "Card unfrozen.",
                        );
                      }}
                    />
                  }
                />
                <View style={styles.cardActions}>
                  {!card.isDefault ? (
                    <Button
                      label="Make default"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => mutate(() => api.cards.setDefault(card.id), "Default card updated.")}
                    />
                  ) : null}
                  <Button
                    label="Remove card"
                    variant="ghost"
                    disabled={busy}
                    onPress={() => setRemoving(card)}
                  />
                </View>
              </Card>
            ))}
          </Stack>
        ) : !cards.error ? (
          <EmptyState
            icon="card-outline"
            title="No cards yet"
            message="Link a card to get started."
          />
        ) : null}
      </Section>

      {cards.data?.length ? (
        <ListCard>
          <Row
            title="Freeze all cards"
            subtitle="Temporarily block new charges"
            right={
              <Switch
                accessibilityLabel="Freeze all cards"
                value={cards.data.every((card) => card.frozen)}
                disabled={busy}
                onValueChange={(frozen) => {
                  void mutate(
                    () => api.cards.freezeAll(frozen),
                    frozen ? "All cards frozen." : "All cards unfrozen.",
                  );
                }}
              />
            }
          />
        </ListCard>
      ) : null}

      {adding ? (
        <Card style={{ padding: 20, gap: 16 }}>
          <SectionHeader title="Test card details" />
          <Banner
            tone="info"
            message="This saves simulated card details. It does not link or charge a real card."
          />
          <View style={styles.brandRow}>
            {BRANDS.map((option) => (
              <Button
                key={option}
                label={option}
                variant={option === brand ? "primary" : "secondary"}
                onPress={() => setBrand(option)}
              />
            ))}
          </View>
          <Field label="Card nickname" value={label} onChangeText={setLabel} />
          <Field
            label="Last four digits only"
            value={last4}
            onChangeText={(value) => setLast4(value.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Field
            label="Expiry (MM/YY)"
            value={expiry}
            onChangeText={setExpiry}
            maxLength={5}
            placeholder="09/29"
          />
          <Button label="Save test card" loading={busy} disabled={!valid} onPress={add} />
          <Button
            label="Cancel"
            variant="ghost"
            disabled={busy}
            onPress={() => setAdding(false)}
          />
        </Card>
      ) : (
        <Button
          label="Add a test card manually"
          variant="ghost"
          onPress={() => setAdding(true)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
