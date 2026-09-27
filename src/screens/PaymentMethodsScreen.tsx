import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";

import { ApiError, api } from "@/src/api/client";
import { CardBrandMark } from "@/src/components/marks";
import {
  Banner,
  Button,
  Card,
  Divider,
  EmptyState,
  HeaderBar,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { CardBrand } from "@/src/types";

const BRANDS: CardBrand[] = ["visa", "mastercard", "amex", "paystack", "bank"];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { data, loading, error, reload } = useApi(() => api.cards.list(), []);

  const [adding, setAdding] = useState(false);
  const [brand, setBrand] = useState<CardBrand>("visa");
  const [label, setLabel] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const digits = number.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  const valid =
    digits.length >= 12 && /^\d{2}\/\d{2}$/.test(expiry) && label.trim().length > 0;

  const submit = async () => {
    setFailure(null);
    setBusy(true);
    try {
      await api.cards.add({
        brand,
        label: label.trim(),
        last4: last4.padStart(4, "0"),
        expiry,
        holder: "ODUE ASARE",
      });
      setAdding(false);
      setLabel("");
      setNumber("");
      setExpiry("");
      await reload();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not add card");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <HeaderBar title="Payment methods" onBack={() => router.back()} />

      {error ? <Banner tone="danger" message={error} /> : null}

      <SectionHeader title={`${data?.length ?? 0} cards`} />

      {loading && !data ? (
        <Card style={{ padding: 16, gap: 14 }}>
          <Skeleton height={44} />
          <Skeleton height={44} width="80%" />
        </Card>
      ) : data?.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {data.map((card, index) => (
            <View key={card.id}>
              <Row
                title={card.label}
                subtitle={`•••• ${card.last4} · expires ${card.expiry}`}
                left={<CardBrandMark brand={card.brand} size="sm" />}
                right={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {card.isDefault ? (
                      <Text
                        style={{
                          color: colors.accent,
                          fontSize: 10,
                          fontWeight: "800",
                        }}
                      >
                        DEFAULT
                      </Text>
                    ) : null}
                    <Pressable
                      onPress={() =>
                        Alert.alert("Remove card?", `•••• ${card.last4} will be removed.`, [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => void api.cards.remove(card.id),
                          },
                        ])
                      }
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove card ending ${card.last4}`}
                    >
                      <Ionicons name="trash-outline" size={17} color={colors.danger} />
                    </Pressable>
                  </View>
                }
              />
              {index < data.length - 1 ? <Divider inset={60} /> : null}
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="card-outline"
          title="No cards yet"
          message="Add a card to pay bills and check out faster."
        />
      )}

      <View style={{ height: 12 }} />

      <Card style={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="snow-outline" size={17} color={colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
              Freeze cards
            </Text>
            <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
              Temporarily block new charges
            </Text>
          </View>
          <Switch
            value={data?.some((card) => card.frozen) ?? false}
            onValueChange={(next) =>
              void (next
                ? api.cards.freezeAll(true)
                : api.cards.freezeAll(false))
            }
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel="Freeze all cards"
          />
        </View>
      </Card>

      {adding ? (
        <View style={{ marginTop: 20 }}>
          <SectionHeader title="New card" />
          <Card style={{ padding: 18, gap: 14 }}>
            {failure ? <Banner tone="danger" message={failure} /> : null}

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {BRANDS.map((option) => {
                const active = brand === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setBrand(option)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={option}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 8,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active ? colors.accentSoft : "transparent",
                    }}
                  >
                    <CardBrandMark brand={option} size="sm" />
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Card nickname, e.g. Personal"
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Card nickname"
              style={input(colors, radii)}
            />
            <TextInput
              value={number}
              onChangeText={setNumber}
              keyboardType="number-pad"
              placeholder="Card number"
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Card number"
              style={input(colors, radii)}
            />
            <TextInput
              value={expiry}
              onChangeText={setExpiry}
              keyboardType="numbers-and-punctuation"
              placeholder="Expiry, e.g. 09/29"
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Card expiry"
              style={input(colors, radii)}
            />

            <Button
              label="Save card"
              onPress={submit}
              loading={busy}
              disabled={!valid}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => setAdding(false)}
            />
          </Card>
        </View>
      ) : (
        <View style={{ marginTop: 16 }}>
          <Button
            label="Add a card"
            variant="secondary"
            icon="add"
            onPress={() => setAdding(true)}
          />
        </View>
      )}

      <Text
        style={{
          color: colors.textSubtle,
          fontSize: 11,
          textAlign: "center",
          lineHeight: 17,
          marginTop: 18,
        }}
      >
        Card details are tokenised and never stored on this device. Demo build —
        nothing is sent anywhere.
      </Text>
    </Screen>
  );
}

function input(
  colors: ReturnType<typeof useTheme>["colors"],
  radii: ReturnType<typeof useTheme>["radii"],
) {
  return {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 15,
  } as const;
}
