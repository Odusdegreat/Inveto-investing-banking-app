import { api, type BiometricCredential } from "@/src/api/client";
import { errorMessage, toast } from "@/src/components/Toast";
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
import { useApi } from "@/src/hooks/useApi";
import { passkeySupported, registerPasskey } from "@/src/lib/passkeys";
import { confirmStepUp } from "@/src/lib/stepUp";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export default function Biometrics() {
  const router = useRouter();
  const { colors } = useTheme();
  const credentials = useApi(() => api.security.biometricCredentials(), []);
  const security = useApi(() => api.security.get(), []);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<BiometricCredential | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const supported = passkeySupported();
  const enroll = async () => {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const token = await confirmStepUp(
        "biometric_enroll",
        "Confirm adding a passkey for sensitive actions.",
      );
      if (!token) return;
      await registerPasskey(token);
      toast.success("Passkey registered.");
      await Promise.all([credentials.reload(), security.reload()]);
    } catch (error) {
      const message = errorMessage(error);
      setFailure(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!removing || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const token = await confirmStepUp(
        "security_downgrade",
        "Confirm removing this passkey. It will no longer approve account actions.",
      );
      if (!token) return;
      await api.security.revokeBiometric(removing.id, token);
      setRemoving(null);
      toast.success("Passkey removed from your account.");
      await credentials.reload();
    } catch (error) {
      const message = errorMessage(error);
      setFailure(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      gap={22}
      onRefresh={credentials.refresh}
      refreshing={credentials.refreshing}
    >
      <HeaderBar title="Passkeys" onBack={() => router.back()} />

      <Section title="Confirm with your device" gap={14}>
        <Card style={{ padding: 20, gap: 16 }}>
          <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>
            Use a passkey with your device&apos;s face, fingerprint, or screen
            lock to approve sensitive actions. Your transaction PIN remains
            available.
          </Text>
          {!supported ? (
            <Banner
              tone="info"
              message="This device or browser cannot use passkeys. You can still manage existing passkeys and use your PIN."
            />
          ) : null}
          {security.data && !security.data.pinSet ? (
            <Button
              label="Set up transaction PIN first"
              onPress={() => router.push("/securitysettings")}
            />
          ) : (
            <Button
              label="Add a passkey"
              icon="finger-print-outline"
              loading={busy}
              disabled={!supported || !security.data || credentials.loading}
              onPress={enroll}
            />
          )}
        </Card>
      </Section>

      {failure ? <Banner tone="danger" message={failure} /> : null}
      {security.error ? (
        <ErrorState message={security.error} onRetry={security.reload} />
      ) : null}
      {credentials.error ? (
        <ErrorState message={credentials.error} onRetry={credentials.reload} />
      ) : null}

      {removing ? (
        <Card style={{ padding: 20, gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>
            Remove {removing.name ?? "this passkey"} from your account? This
            does not delete it from your device&apos;s password manager.
          </Text>
          <Button
            label="Remove passkey"
            variant="danger"
            loading={busy}
            onPress={remove}
          />
          <Button
            label="Keep passkey"
            variant="ghost"
            disabled={busy}
            onPress={() => setRemoving(null)}
          />
        </Card>
      ) : null}

      <Section title="Registered passkeys" gap={12}>
        {credentials.loading ? (
          <Card style={{ padding: 20, gap: 16 }}>
            <Skeleton height={44} />
            <Skeleton height={44} width="75%" />
          </Card>
        ) : credentials.data?.length ? (
          <ListCard>
            {credentials.data.map((credential, index) => (
              <Row
                key={credential.id}
                title={credential.name ?? `Passkey ${index + 1}`}
                subtitle={
                  credential.createdAt
                    ? `Added ${new Date(credential.createdAt).toLocaleDateString()}`
                    : (credential.deviceType ?? "Registered credential")
                }
                icon="key-outline"
                right={
                  <Pressable
                    onPress={() => setRemoving(credential)}
                    disabled={busy}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${credential.name ?? `passkey ${index + 1}`}`}
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
        ) : !credentials.error ? (
          <EmptyState
            icon="key-outline"
            title="No passkeys yet"
            message="Add one to approve actions with your device."
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
