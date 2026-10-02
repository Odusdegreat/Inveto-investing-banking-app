import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { api } from "@/src/api/client";
import { Field } from "@/src/components/AuthShell";
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  HeaderBar,
  ListCard,
  Row,
  Screen,
  Section,
  Skeleton,
} from "@/src/components/ui";
import { errorMessage, toast } from "@/src/components/Toast";
import { useApi } from "@/src/hooks/useApi";
import { maskAccountNumber } from "@/src/lib/format";
import { confirmStepUp } from "@/src/lib/stepUp";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { Beneficiary } from "@/src/types";

export default function Beneficiaries() {
  const router = useRouter();
  const { colors } = useTheme();
  const beneficiaries = useApi(() => api.beneficiaries.list(), []);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Beneficiary | null>(null);
  const valid = name.trim().length > 1 && bank.trim().length > 1 && /^\d{6,34}$/.test(accountNumber);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await action(); }
    catch (err) { const message = errorMessage(err); setError(message); toast.error(message); }
    finally { setBusy(false); }
  };
  const add = () => run(async () => {
    if (!valid) return;
    const stepUpToken = await confirmStepUp("beneficiary_add", `Confirm adding ${name.trim()} at ${bank.trim()} as a beneficiary.`);
    if (!stepUpToken) return;
    await api.beneficiaries.add({ name: name.trim(), bank: bank.trim(), accountNumber, stepUpToken });
    setName(""); setBank(""); setAccountNumber("");
    toast.success("Beneficiary added.");
    await beneficiaries.reload();
  });
  return (
    <Screen
      gap={22}
      onRefresh={beneficiaries.refresh}
      refreshing={beneficiaries.refreshing}
    >
      <HeaderBar title="Beneficiaries" onBack={() => router.back()} />

      {error ? <Banner tone="danger" message={error} /> : null}

      <Section title="Add a beneficiary" gap={16}>
        <Card style={{ padding: 20, gap: 16 }}>
          <Field
            label="Account holder name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Field label="Bank" value={bank} onChangeText={setBank} />
          <Field
            label="Account number"
            value={accountNumber}
            onChangeText={(value) => setAccountNumber(value.replace(/\D/g, ""))}
            keyboardType="number-pad"
            maxLength={34}
            hint="6 to 34 digits. Check these details before saving."
          />
          <Button
            label="Add beneficiary"
            loading={busy}
            disabled={!valid}
            onPress={add}
          />
        </Card>
      </Section>

      {removing ? (
        <Card style={{ padding: 20, gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>
            Remove {removing.name} from your beneficiaries?
          </Text>
          <Button
            label="Remove beneficiary"
            variant="danger"
            loading={busy}
            onPress={() =>
              run(async () => {
                await api.beneficiaries.remove(removing.id);
                setRemoving(null);
                toast.success("Beneficiary removed.");
                await beneficiaries.reload();
              })
            }
          />
          <Button
            label="Keep beneficiary"
            variant="ghost"
            disabled={busy}
            onPress={() => setRemoving(null)}
          />
        </Card>
      ) : null}

      <Section title="Saved beneficiaries" gap={12}>
        {beneficiaries.error ? (
          <ErrorState
            message={beneficiaries.error}
            onRetry={beneficiaries.reload}
          />
        ) : beneficiaries.loading ? (
          <Card style={{ padding: 20, gap: 18 }}>
            <Skeleton height={44} />
            <Skeleton height={44} width="75%" />
          </Card>
        ) : beneficiaries.data?.length ? (
          <ListCard>
            {beneficiaries.data.map((person) => (
              <Row
                key={person.id}
                title={person.name}
                subtitle={`${person.bank} · ${maskAccountNumber(person.accountNumber)}`}
                icon="person-outline"
                right={
                  <Pressable
                    onPress={() => setRemoving(person)}
                    disabled={busy}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${person.name}`}
                  >
                    <Text
                      style={[
                        styles.removeAction,
                        { color: busy ? colors.textSubtle : colors.danger },
                      ]}
                    >
                      Remove
                    </Text>
                  </Pressable>
                }
              />
            ))}
          </ListCard>
        ) : !beneficiaries.error ? (
          <EmptyState
            icon="people-outline"
            title="No beneficiaries yet"
            message="Save someone above to send them money."
          />
        ) : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  removeAction: {
    fontSize: 13,
    fontWeight: "700",
  },
});
