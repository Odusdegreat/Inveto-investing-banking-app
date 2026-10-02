import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Linking, Platform, Switch, Text } from "react-native";
import { api } from "@/src/api/client";
import { Banner, Button, Card, Divider, ErrorState, HeaderBar, ListCard, Row, Screen, Section, Stack } from "@/src/components/ui";
import { errorMessage, toast } from "@/src/components/Toast";
import { useApi } from "@/src/hooks/useApi";
import { getPushRegistration, pushAvailability, registerDevicePush, unregisterDevicePush } from "@/src/lib/push";
import { useSession } from "@/src/store/session";
import { useTheme } from "@/src/theme/ThemeProvider";

export default function NotificationSettings() {
  const router = useRouter();
  const { colors } = useTheme();
  const userId = useSession((s) => s.user?.id);
  const registration = useApi(() => userId ? getPushRegistration(userId) : Promise.resolve(null), [userId]);
  const preferences = useApi(() => api.security.get(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unavailable = pushAvailability();
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await action(); }
    catch (err) { const message = errorMessage(err); setError(message); toast.error(message); }
    finally { setBusy(false); }
  };
  const register = () => run(async () => {
    if (!userId) return;
    const result = await registerDevicePush(userId);
    registration.setData(result);
    if (result.deliveryEnabled) toast.success("Push notifications enabled on this device.");
    else toast.info("Device registered. Push delivery is not active yet.");
  });
  const remove = () => run(async () => {
    if (!userId) return;
    await unregisterDevicePush(userId);
    registration.setData(null);
    toast.success("Push registration removed for this device.");
  });
const update = (key: "transactionAlerts" | "loginAlerts" | "emailTransactionAlerts" | "emailLoginAlerts" | "emailSecurityAlerts" | "emailMarketing", value: boolean) => run(async () => {
    await api.security.update({ [key]: value });
    await preferences.reload();
    toast.success("Notification preference saved.");
  });
  return (
    <Screen gap={22}>
      <HeaderBar title="Notification settings" onBack={() => router.back()} />

      {error ? <Banner tone="danger" message={error} /> : null}
      {registration.error ? (
        <ErrorState message={registration.error} onRetry={registration.reload} />
      ) : null}

      <Section title="This device" gap={16}>
        <Card style={{ padding: 20, gap: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>
            Choose whether INVETO can send notifications to this phone. Your
            in-app inbox is always available.
          </Text>
          {unavailable ? <Banner tone="info" message={unavailable} /> : null}
          {registration.data ? (
            <Stack gap={12}>
              <Banner
                tone={registration.data.deliveryEnabled ? "success" : "warning"}
                message={
                  registration.data.deliveryEnabled
                    ? "This device is registered for push notifications."
                    : "Device registered. The notification service is not sending pushes yet."
                }
              />
              <Button
                label="Refresh device registration"
                loading={busy}
                disabled={Boolean(unavailable)}
                variant="secondary"
                onPress={register}
              />
              <Button
                label="Remove this device's registration"
                variant="ghost"
                loading={busy}
                onPress={remove}
              />
            </Stack>
          ) : (
            <Button
              label="Enable push notifications"
              loading={busy || registration.loading}
              disabled={Boolean(unavailable) || !userId}
              onPress={register}
            />
          )}
          {Platform.OS !== "web" ? (
            <Button
              label="Open device notification settings"
              variant="ghost"
              onPress={() => {
                void Linking.openSettings().catch((err) =>
                  toast.error(errorMessage(err)),
                );
              }}
            />
          ) : null}
        </Card>
      </Section>

      <Section title="Account alerts" gap={12}>
        {preferences.error ? (
          <ErrorState
            message={preferences.error}
            onRetry={preferences.reload}
          />
        ) : (
          <ListCard>
            <Row
              title="Transaction alerts"
              subtitle="Account activity and payments"
              right={
                <Switch
                  accessibilityLabel="Transaction alerts"
                  value={preferences.data?.transactionAlerts ?? false}
                  disabled={busy || !preferences.data}
                  onValueChange={(value) => update("transactionAlerts", value)}
                />
              }
            />
            <Divider />
            <Row
              title="Sign-in alerts"
              subtitle="New account sign-ins"
              right={
                <Switch
                  accessibilityLabel="Sign-in alerts"
                  value={preferences.data?.loginAlerts ?? false}
                  disabled={busy || !preferences.data}
                  onValueChange={(value) => update("loginAlerts", value)}
                />
              }
            />
          </ListCard>
        )}
      </Section>

      <Section title="Email notifications" gap={12}>
        {preferences.error ? (
          <ErrorState
            message={preferences.error}
            onRetry={preferences.reload}
          />
        ) : (
          <ListCard>
            <Row
              title="Transaction emails"
              subtitle="Receipts and account activity summaries"
              right={
                <Switch
                  accessibilityLabel="Transaction emails"
                  value={preferences.data?.emailTransactionAlerts ?? false}
                  disabled={busy || !preferences.data}
                  onValueChange={(value) => update("emailTransactionAlerts", value)}
                />
              }
            />
            <Divider />
            <Row
              title="Security emails"
              subtitle="Sign-in alerts, password changes, and security updates"
              right={
                <Switch
                  accessibilityLabel="Security emails"
                  value={preferences.data?.emailSecurityAlerts ?? false}
                  disabled={busy || !preferences.data}
                  onValueChange={(value) => update("emailSecurityAlerts", value)}
                />
              }
            />
            <Divider />
            <Row
              title="Sign-in alerts"
              subtitle="New account sign-ins"
              right={
                <Switch
                  accessibilityLabel="Sign-in alert emails"
                  value={preferences.data?.emailLoginAlerts ?? false}
                  disabled={busy || !preferences.data}
                  onValueChange={(value) => update("emailLoginAlerts", value)}
                />
              }
            />
            <Divider />
            <Row
              title="Product updates & tips"
              subtitle="New features, investment insights, and occasional offers"
              right={
                <Switch
                  accessibilityLabel="Marketing emails"
                  value={preferences.data?.emailMarketing ?? false}
                  disabled={busy || !preferences.data}
                  onValueChange={(value) => update("emailMarketing", value)}
                />
              }
            />
          </ListCard>
        )}
      </Section>
    </Screen>
  );
}
