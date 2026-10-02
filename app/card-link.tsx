import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { api } from "@/src/api/client";
import { Banner, Button, Card, HeaderBar, Screen, Section, Stack } from "@/src/components/ui";
import { errorMessage, toast } from "@/src/components/Toast";
import { useSession } from "@/src/store/session";
import { useTheme } from "@/src/theme/ThemeProvider";
import { DemoBanner } from "@/src/components/DemoBanner";

type PendingLink = { reference: string; authorizationUrl: string };
export default function CardLink() {
  const router = useRouter();
  const { colors } = useTheme();
  const userId = useSession((s) => s.user?.id);
  const params = useLocalSearchParams<{ reference?: string | string[] }>();
  const [pending, setPending] = useState<PendingLink | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storageKey = `inveto.card-link.${userId}`;
  const returnedReference = singleParam(params.reference);
  const mismatch = Boolean(returnedReference && pending && returnedReference !== pending.reference);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (!raw || !active) return;
      const value = JSON.parse(raw) as PendingLink;
      if (!value.reference) throw new Error("The saved card-link session is incomplete.");
      setPending(value);
    }).catch(() => { if (active) setError("Could not restore your card-link session. Try again."); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [storageKey, userId]);

  const fail = (err: unknown) => { const message = errorMessage(err); setError(message); toast.error(message); };

  const initialize = async (defaultOutcome?: "success" | "failed" | "pending") => {
    if (busy || !loaded || !userId || pending) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.cards.initializeLink(defaultOutcome);
      if (!result.reference) throw new Error("The server did not return a card-link reference.");
      const value = { reference: result.reference, authorizationUrl: result.authorizationUrl ?? result.authorization_url ?? "" };
      await AsyncStorage.setItem(storageKey, JSON.stringify(value));
      setPending(value);
      router.setParams({ reference: undefined });
      toast.info("Simulated checkout is ready.");
    } catch (err) { fail(err); }
    finally { setBusy(false); }
  };

  const openSimulatedCheckout = async (outcome: "success" | "failed" | "pending" = "success") => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await simulateCheckoutCompletion(pending.reference, outcome);
      toast.success(outcome === "success" ? "Simulated checkout completed. Verify your card." : `Simulated checkout ${outcome}.`);
    } catch (err) { fail(err); }
    finally { setBusy(false); }
  };

  const confirm = async (simulate?: "success" | "failed" | "pending") => {
    if (!pending || busy || mismatch) return;
    setBusy(true);
    setError(null);
    try {
      await api.cards.confirmLink(pending.reference, simulate);
      setDone(true);
      setPending(null);
      router.setParams({ reference: undefined });
      await AsyncStorage.removeItem(storageKey);
      toast.success(simulate === "failed" ? "Simulated failure confirmed." : "Card linked successfully (simulated).");
    } catch (err) { fail(err); }
    finally { setBusy(false); }
  };

  return (
    <Screen gap={22}>
      <HeaderBar title="Link a card" onBack={() => router.back()} />
      <DemoBanner />

      <Section title={done ? "Card linked" : "Simulated Checkout"} gap={16}>
        <Card style={{ padding: 20, gap: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>
            This is a simulated card linking flow. No real card details are collected.
            Tap Open Simulated Checkout to simulate adding a card.
          </Text>

          {!done ? (
            <Banner
              tone="info"
              message="Simulated checkout mode. Use the buttons below to simulate success or failure."
            />
          ) : (
            <Banner
              tone="success"
              message="Your linked card is available in Payment methods."
            />
          )}
          {error ? <Banner tone="danger" message={error} /> : null}
          {mismatch ? (
            <Banner
              tone="danger"
              message="This return link does not match the checkout you started. Reopen your saved checkout to continue."
            />
          ) : null}

          {!loaded ? (
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>
              Checking for an unfinished checkout...
            </Text>
          ) : done ? (
            <Button
              label="View payment methods"
              onPress={() => router.replace("/paymentmethods")}
            />
          ) : pending ? (
            <Stack gap={14}>
              <Text
                selectable
                style={{ color: colors.textSubtle, fontSize: 13, lineHeight: 19 }}
              >
                Reference: {pending.reference}
              </Text>
              <Button
                label="Open Simulated Checkout (Success)"
                icon="open-outline"
                loading={busy}
                onPress={() => openSimulatedCheckout("success")}
              />
              <Button
                label="Open Simulated Checkout (Failure)"
                variant="ghost"
                loading={busy}
                onPress={() => openSimulatedCheckout("failed")}
              />
              <Button
                label="Open Simulated Checkout (Pending)"
                variant="secondary"
                loading={busy}
                onPress={() => openSimulatedCheckout("pending")}
              />
              <Button
                label="I have completed checkout, verify card (Success)"
                variant="secondary"
                loading={busy}
                disabled={mismatch}
                onPress={() => confirm("success")}
              />
              <Button
                label="Verify with Simulated Failure"
                variant="dangerOutline"
                loading={busy}
                disabled={mismatch}
                onPress={() => confirm("failed")}
              />
              <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>
                After simulated checkout, return here and verify your card.
              </Text>
            </Stack>
          ) : (
            <Stack gap={10}>
              <Button label="Start simulated card linking (Success)" loading={busy} onPress={() => initialize("success")} />
              <Button label="Start simulated card linking (Failure)" variant="ghost" loading={busy} onPress={() => initialize("failed")} />
              <Button label="Start simulated card linking (Pending)" variant="secondary" loading={busy} onPress={() => initialize("pending")} />
            </Stack>
          )}
        </Card>
      </Section>

      <Button
        label="Back to payment methods"
        variant="ghost"
        disabled={busy}
        onPress={() => router.replace("/paymentmethods")}
      />
    </Screen>
  );
}

function singleParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

async function simulateCheckoutCompletion(reference: string, outcome: "success" | "failed" | "pending" = "success") {
  return { reference, status: outcome };
}