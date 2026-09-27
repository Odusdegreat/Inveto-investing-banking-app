import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";

import { ApiError, api } from "@/src/api/client";
import {
  Banner,
  Button,
  Card,
  Chip,
  Divider,
  ErrorState,
  HeaderBar,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatRelative } from "@/src/lib/format";
import { confirmStepUp } from "@/src/lib/stepUp";
import { useTheme } from "@/src/theme/ThemeProvider";

type Panel = "pin" | "password" | null;

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const security = useApi(() => api.security.get(), []);
  const devices = useApi(() => api.security.devices(), []);

  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggle = async (
    key: "twoFactorEnabled" | "biometricsEnabled",
    value: boolean,
  ) => {
    setFailure(null);
    if (key === "biometricsEnabled" && value) {
      const supported = await LocalAuthentication.hasHardwareAsync().catch(
        () => false,
      );
      if (!supported) {
        setFailure("This device does not support biometric unlock");
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm it is you",
      }).catch(() => ({ success: false }));
      if (!result.success) {
        setFailure("Biometric check was cancelled");
        return;
      }
    }

    // Turning a control OFF is a downgrade, so it needs the transaction PIN.
    // Turning one ON is allowed without it.
    let stepUpToken: string | undefined;
    if (!value) {
      const label =
        key === "twoFactorEnabled"
          ? "two-factor authentication"
          : "biometric unlock";
      const token = await confirmStepUp(
        `Confirm turning off ${label}.`,
      );
      if (!token) {
        setFailure("Cancelled. Your PIN is required to change security settings.");
        return;
      }
      stepUpToken = token;
    }

    try {
      await api.security.update({ [key]: value }, stepUpToken);
      await security.reload();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not update");
    }
  };

  const reloadAll = async () => {
    await Promise.all([security.reload(), devices.reload()]);
  };

  if (security.error) {
    return (
      <Screen>
        <HeaderBar title="Security" onBack={() => router.back()} />
        <ErrorState message={security.error} onRetry={reloadAll} />
      </Screen>
    );
  }

  return (
    <Screen>
      <HeaderBar title="Security" onBack={() => router.back()} />

      {failure ? <Banner tone="danger" message={failure} /> : null}
      {success ? <Banner tone="success" message={success} /> : null}

      {panel === "pin" ? (
        <PinPanel
          onDone={async (message) => {
            setPanel(null);
            setSuccess(message);
          }}
          onCancel={() => setPanel(null)}
          onError={setFailure}
          busy={busy}
          setBusy={setBusy}
        />
      ) : null}

      {panel === "password" ? (
        <PasswordPanel
          onDone={async (message) => {
            setPanel(null);
            setSuccess(message);
          }}
          onCancel={() => setPanel(null)}
          onError={setFailure}
          busy={busy}
          setBusy={setBusy}
        />
      ) : null}

      {panel === null ? (
        <>
          <SectionHeader title="Access" />
          <Card style={{ paddingVertical: 4 }}>
            <Row
              title="Transaction PIN"
              subtitle="Required for payments and PIN unlock"
              icon="keypad-outline"
              chevron
              onPress={() => setPanel("pin")}
            />
            <Divider inset={52} />
            <Row
              title="Change password"
              subtitle="Last updated recently"
              icon="lock-closed-outline"
              chevron
              onPress={() => setPanel("password")}
            />
            <Divider inset={52} />
            <Row
              title="Biometric unlock"
              subtitle="Face or fingerprint on this device"
              icon="finger-print-outline"
              right={
                <Switch
                  value={security.data?.biometricsEnabled ?? false}
                  disabled={!security.data}
                  onValueChange={(value) => void toggle("biometricsEnabled", value)}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor={colors.surface}
                  accessibilityLabel="Biometric unlock"
                />
              }
            />
            <Divider inset={52} />
            <Row
              title="Two-factor authentication"
              subtitle="Require a code for new devices"
              icon="shield-checkmark-outline"
              right={
                <Switch
                  value={security.data?.twoFactorEnabled ?? false}
                  disabled={!security.data}
                  onValueChange={(value) => void toggle("twoFactorEnabled", value)}
                  trackColor={{ true: colors.accent, false: colors.border }}
                  thumbColor={colors.surface}
                  accessibilityLabel="Two-factor authentication"
                />
              }
            />
          </Card>

          <View style={{ height: 24 }} />

          <SectionHeader title="Signed-in devices" />
          {devices.loading && !devices.data ? (
            <Card style={{ padding: 16, gap: 12 }}>
              <Skeleton height={40} />
              <Skeleton height={40} width="70%" />
            </Card>
          ) : (
            <Card style={{ paddingVertical: 4 }}>
              {(devices.data ?? []).map((device, index) => (
                <View key={device.id}>
                  <Row
                    title={device.name}
                    subtitle={`${device.platform} · ${formatRelative(device.lastActiveAt)}`}
                    left={
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: device.current
                            ? colors.accentSoft
                            : colors.surfaceRaised,
                        }}
                      >
                        <Ionicons
                          name={
                            device.platform === "web"
                              ? "desktop-outline"
                              : "phone-portrait-outline"
                          }
                          size={17}
                          color={device.current ? colors.accent : colors.textMuted}
                        />
                      </View>
                    }
                    right={
                      device.current ? (
                        <Chip label="This device" tone="success" />
                      ) : (
                        <Pressable
                          onPress={() =>
                            Alert.alert(
                              "Sign out device?",
                              `${device.name} will need to sign in again.`,
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Sign out",
                                  style: "destructive",
                                  onPress: () => void api.security.revokeDevice(device.id),
                                },
                              ],
                            )
                          }
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={`Sign out ${device.name}`}
                        >
                          <Text
                            style={{ color: colors.danger, fontSize: 12, fontWeight: "700" }}
                          >
                            Sign out
                          </Text>
                        </Pressable>
                      )
                    }
                  />
                  {index < (devices.data?.length ?? 0) - 1 ? (
                    <Divider inset={52} />
                  ) : null}
                </View>
              ))}
            </Card>
          )}

          {security.data ? (
            <Card style={{ padding: 16, marginTop: 16, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
                {security.data.twoFactorEnabled ? "Well protected" : "Add 2FA"}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>
                {security.data.twoFactorEnabled
                  ? "Two-factor authentication is on. A code is required when signing in on a new device."
                  : "Without 2FA, only your password protects your account if it is compromised."}
              </Text>
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function PinPanel({
  onDone,
  onCancel,
  onError,
  busy,
  setBusy,
}: {
  onDone: (message: string) => Promise<void>;
  onCancel: () => void;
  onError: (message: string | null) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const { colors, radii } = useTheme();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const valid =
    next.length === 4 && /^\d{4}$/.test(next) && next === confirm && next !== "1234";

  const submit = async () => {
    onError(null);

    // The confirm screen collects the CURRENT PIN, which doubles as proof of
    // identity for changing the PIN itself.
    const stepUpToken = await confirmStepUp(
      "Enter your current transaction PIN to change it.",
    );
    if (!stepUpToken) {
      onError("Cancelled. Your current PIN is required to change it.");
      return;
    }

    setBusy(true);
    try {
      await api.auth.setPin(next, stepUpToken);
      await onDone("Transaction PIN updated");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not update PIN");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ padding: 18, gap: 14 }}>
      <SectionHeader title="New transaction PIN" />
      <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
        Four digits, and not something guessable.
      </Text>

      <TextInput
        value={next}
        onChangeText={setNext}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="New PIN"
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel="New PIN"
        style={pinInput(colors, radii)}
      />
      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        keyboardType="number-pad"
        maxLength={4}
        placeholder="Confirm PIN"
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel="Confirm new PIN"
        style={pinInput(colors, radii)}
      />

      {confirm.length === 4 && confirm !== next ? (
        <Text style={{ color: colors.danger, fontSize: 12 }}>PINs do not match</Text>
      ) : null}

      <Button label="Save PIN" onPress={submit} loading={busy} disabled={!valid} />
      <Button label="Cancel" variant="ghost" onPress={onCancel} />
    </Card>
  );
}

function PasswordPanel({
  onDone,
  onCancel,
  onError,
  busy,
  setBusy,
}: {
  onDone: (message: string) => Promise<void>;
  onCancel: () => void;
  onError: (message: string | null) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const { colors, radii } = useTheme();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const valid = current.length >= 6 && next.length >= 6 && current !== next;

  const submit = async () => {
    onError(null);

    const stepUpToken = await confirmStepUp(
      "Confirm your transaction PIN to change your password.",
    );
    if (!stepUpToken) {
      onError("Cancelled. Your PIN is required to change your password.");
      return;
    }

    setBusy(true);
    try {
      await api.auth.changePassword(current, next, stepUpToken);
      await onDone("Password updated");
    } catch (err) {
      onError(
        err instanceof ApiError ? err.message : "Could not change password",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ padding: 18, gap: 14 }}>
      <SectionHeader title="Change password" />
      <TextInput
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        placeholder="Current password"
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel="Current password"
        style={pinInput(colors, radii)}
      />
      <TextInput
        value={next}
        onChangeText={setNext}
        secureTextEntry
        placeholder="New password"
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel="New password"
        style={pinInput(colors, radii)}
      />
      <Button label="Update password" onPress={submit} loading={busy} disabled={!valid} />
      <Button label="Cancel" variant="ghost" onPress={onCancel} />
    </Card>
  );
}

function pinInput(
  colors: ReturnType<typeof useTheme>["colors"],
  radii: ReturnType<typeof useTheme>["radii"],
) {
  return {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 18,
    letterSpacing: 6,
  } as const;
}
