import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { z } from "zod";

import { api } from "@/src/api/client";
import {
  AuthLink,
  AuthShell,
  Field,
  PasswordRules,
  PasswordStrength,
} from "@/src/components/AuthShell";
import { Banner, Button } from "@/src/components/ui";
import { errorMessage, toast } from "@/src/components/Toast";
import { actionToken, singleParam } from "@/src/lib/links";
import { saveTokens } from "@/src/api/http";
import { useSession } from "@/src/store/session";

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number");

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const [manualToken, setManualToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkToken = singleParam(params.token);
  const token = actionToken(linkToken || manualToken);
  const parsed = passwordSchema.safeParse(password);
  const mismatch = confirmation.length > 0 && password !== confirmation;
  const valid = Boolean(token) && parsed.success && password === confirmation;

  const submit = async () => {
    if (busy) return;

    if (!token || !parsed.success || password !== confirmation) {
      setError(
        !token
          ? "Open your reset link or enter its token."
          : !parsed.success
            ? parsed.error.issues[0].message
            : "Passwords do not match.",
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await api.auth.confirmPasswordReset(token, password);
      await saveTokens(null);
      useSession.setState({ status: "signed-out", user: null, challengeToken: null });
      setPassword("");
      setConfirmation("");
      setManualToken("");
      router.setParams({ token: undefined });
      setDone(true);
      toast.success("Password reset. Sign in with your new password.");
    } catch (err) {
      const message = errorMessage(err, "Could not reset your password.");
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthShell
        title="Password updated"
        subtitle="Use your new password next time you sign in."
        footer={<AuthLink label="Go to sign in" onPress={() => router.replace("/signin")} />}
      >
        <Banner tone="success" message="Your password has been reset." />
        <Button
          label="Sign in"
          size="lg"
          icon="log-in-outline"
          onPress={() => router.replace("/signin")}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use a password you have not used for this account before."
      footer={<AuthLink label="Back to sign in" onPress={() => router.replace("/signin")} />}
    >
      {error ? <Banner tone="danger" message={error} /> : null}

      {!linkToken ? (
        <Field
          label="Reset link or token"
          value={manualToken}
          onChangeText={setManualToken}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="Paste the token from your email"
          hint="Open the link in your email, or paste the code it contains."
        />
      ) : null}

      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Create a new password"
        error={password.length > 0 && !parsed.success ? parsed.error.issues[0].message : undefined}
        footer={
          password ? (
            <View style={styles.passwordMeta}>
              <PasswordStrength value={password} />
              <PasswordRules value={password} />
            </View>
          ) : null
        }
      />

      <Field
        label="Confirm new password"
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        autoComplete="new-password"
        placeholder="Re-enter your new password"
        error={mismatch ? "Passwords do not match" : undefined}
      />

      <Button
        label="Reset password"
        icon="shield-checkmark-outline"
        loading={busy}
        size="lg"
        disabled={!valid}
        onPress={submit}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  passwordMeta: {
    gap: 16,
  },
});
