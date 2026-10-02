import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";

import { Field } from "@/src/components/AuthShell";
import { toast } from "@/src/components/Toast";
import { ApiError, api } from "@/src/api/client";
import {
  Banner,
  Button,
  Card,
  Chip,
  Divider,
  ErrorState,
  HeaderBar,
  ListCard,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
  Stack,
  rowTextInset,
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

  const [twoFactor, setTwoFactor] = useState<boolean | null>(null);
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [enrollment, setEnrollment] = useState<string | null>(null);
  const submitTwoFactor = async () => {
    if (busy || twoFactor === null) return;
    setBusy(true);
    setFailure(null);
    try {
      if (twoFactor && !enrollment) {
        const stepUpToken = security.data?.pinSet ? await confirmStepUp("two_factor_setup", "Confirm setting up two-factor authentication.") : undefined;
        if (stepUpToken === null) return;
        const result = await api.auth.enrollTwoFactor(twoFactorPassword, stepUpToken);
        const setup = result.secret ?? result.otpauthUrl ?? result.uri;
        if (!setup) throw new ApiError("invalid_response", "The server did not return authenticator setup details.");
        setEnrollment(setup);
        return;
      }
      if (twoFactor) await api.auth.confirmTwoFactor(twoFactorCode);
      else {
        const token = await confirmStepUp("security_downgrade", "Confirm turning off two-factor authentication.");
        if (!token) return;
        await api.auth.disableTwoFactor(twoFactorPassword, twoFactorCode, token);
      }
      toast.success("Two-factor authentication updated.");
      setTwoFactor(null);
      setTwoFactorPassword("");
      setTwoFactorCode("");
      setEnrollment(null);
      await security.reload();
      toast.success("Security settings saved.");
    } catch (err) { setFailure(err instanceof Error ? err.message : "Could not update two-factor authentication"); }
    finally { setBusy(false); }
  };
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggle = async (
    key: "twoFactorEnabled" | "biometricsEnabled",
    value: boolean,
  ) => {
    setFailure(null);
    if (key === "twoFactorEnabled") {
      setTwoFactor(value);
      setEnrollment(null);
      setTwoFactorPassword("");
      setTwoFactorCode("");
      return;
    }
    if (value) {
      router.push("/biometrics");
      return;
    }
    // Turning a control OFF is a downgrade, so it needs the transaction PIN.
    // Turning one ON is allowed without it.
    let stepUpToken: string | undefined;
    if (!value) {
      const label = "biometric unlock";
      const token = await confirmStepUp("security_downgrade",
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
    <Screen gap={22}>
      <HeaderBar title="Security" onBack={() => router.back()} />

      {twoFactor !== null ? <Card style={{ padding: 20, gap: 18 }}>
        <SectionHeader title={twoFactor ? "Set up two-factor authentication" : "Turn off two-factor authentication"} />
        <Field label="Current password" value={twoFactorPassword} onChangeText={setTwoFactorPassword} secureTextEntry autoComplete="current-password" />
        {enrollment ? <Text selectable style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>Add this setup value to your authenticator, then enter its code: {enrollment}</Text> : null}
        {(!twoFactor || enrollment) ? <Field label="Authenticator code" value={twoFactorCode} onChangeText={setTwoFactorCode} keyboardType="number-pad" /> : null}
        <Button label={twoFactor && !enrollment ? "Get setup details" : "Confirm"} loading={busy} onPress={submitTwoFactor} />
        <Button label="Cancel" variant="ghost" disabled={busy} onPress={() => { setTwoFactor(null); setEnrollment(null); setTwoFactorPassword(""); setTwoFactorCode(""); }} />
      </Card> : null}
      {failure ? <Banner tone="danger" message={failure} /> : null}
      {success ? <Banner tone="success" message={success} /> : null}

      {panel === "pin" ? (
        <PinPanel
          pinSet={security.data?.pinSet ?? false}
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
        <Stack gap={22}>
          <SectionHeader title="Access" />
          <ListCard>
            <Row
              title="Transaction PIN"
              subtitle="Required for payments and PIN unlock"
              icon="keypad-outline"
              chevron
              onPress={() => setPanel("pin")}
            />
            <Divider inset={rowTextInset(20)} />
            <Row
              title="Change password"
              subtitle="Last updated recently"
              icon="lock-closed-outline"
              chevron
              onPress={() => setPanel("password")}
            />
            <Divider inset={rowTextInset(20)} />
            <Row
              title="Passkey confirmation"
              subtitle="Approve actions with your device"
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
            <Divider inset={rowTextInset(20)} />
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
          </ListCard>

          <ListCard>
            <Row
              title="Manage passkeys"
              subtitle="Register or remove a device credential"
              icon="key-outline"
              chevron
              onPress={() => router.push("/biometrics")}
            />
          </ListCard>

          <SectionHeader title="Signed-in devices" />
          {devices.loading && !devices.data ? (
            <Card style={{ padding: 20, gap: 16 }}>
              <Skeleton height={40} />
              <Skeleton height={40} width="70%" />
            </Card>
          ) : (
            <ListCard>
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
                                  onPress: () => { void api.security.revokeDevice(device.id).then(() => toast.success("Device signed out.")).catch((error) => toast.error(error instanceof Error ? error.message : "Could not sign out this device.")); },
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
                    <Divider inset={rowTextInset(20)} />
                  ) : null}
                </View>
              ))}
            </ListCard>
          )}

          {security.data ? (
            <Card style={{ padding: 20, gap: 10 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                {security.data.twoFactorEnabled ? "Well protected" : "Add 2FA"}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 22 }}>
                {security.data.twoFactorEnabled
                  ? "Two-factor authentication is on. A code is required when signing in on a new device."
                  : "Without 2FA, only your password protects your account if it is compromised."}
              </Text>
            </Card>
          ) : null}
        </Stack>
      ) : null}
    </Screen>
  );
}

function PinPanel({
  pinSet,
  onDone,
  onCancel,
  onError,
  busy,
  setBusy,
}: {
  pinSet: boolean;
  onDone: (message: string) => Promise<void>;
  onCancel: () => void;
  onError: (message: string | null) => void;
  busy: boolean;
  setBusy: (value: boolean) => void;
}) {
  const { colors, radii } = useTheme();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");

  const valid =
    next.length === 4 && /^\d{4}$/.test(next) && next === confirm && next !== "1234";

  const submit = async () => {
    onError(null);

    setBusy(true);
    try {
      if (pinSet) {
        const stepUpToken = await confirmStepUp("pin_change", "Enter your current transaction PIN to change it.");
        if (!stepUpToken) return;
        await api.auth.setPin(next, stepUpToken);
      } else {
        const { setupToken } = await api.auth.setupPin(password);
        await api.auth.setPin(next, undefined, setupToken);
      }
      await onDone("Transaction PIN updated");
      toast.success("Transaction PIN updated.");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Could not update PIN");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ padding: 18, gap: 18 }}>
      <SectionHeader title="New transaction PIN" />
      {!pinSet ? <Field label="Current password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" /> : null}
      <Text style={{ color: colors.textSubtle, fontSize: 12, lineHeight: 17 }}>
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
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  const valid = current.length >= 6 && next.length >= 6 && current !== next;

  const submit = async () => {
    onError(null);

    const stepUpToken = await confirmStepUp("password_change",
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
      toast.success("Password updated.");
    } catch (err) {
      onError(
        err instanceof ApiError ? err.message : "Could not change password",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ padding: 18, gap: 18 }}>
      <SectionHeader title="Change password" />
      <Field
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
      />
      <Field
        label="New password"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        hint="At least 8 characters, including a letter and a number."
      />
      <Button label="Update password" size="lg" onPress={submit} loading={busy} disabled={!valid} />
      <Button label="Cancel" variant="ghost" onPress={onCancel} />
    </Card>
  );
}

function pinInput(
  colors: ReturnType<typeof useTheme>["colors"],
  radii: ReturnType<typeof useTheme>["radii"],
) {
  return {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSunken,
    color: colors.text,
    paddingHorizontal: 16,
    fontSize: 18,
    letterSpacing: 6,
  } as const;
}
