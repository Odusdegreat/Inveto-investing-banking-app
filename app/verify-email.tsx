import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { z } from "zod";

import { api } from "@/src/api/client";
import { AuthLink, AuthShell, Field } from "@/src/components/AuthShell";
import { Banner, Button } from "@/src/components/ui";
import { errorMessage, toast } from "@/src/components/Toast";
import { actionToken, singleParam } from "@/src/lib/links";
import { useSession } from "@/src/store/session";

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const user = useSession((s) => s.user);
  const [email, setEmail] = useState(user?.email ?? "");
  const [manualToken, setManualToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkToken = singleParam(params.token);
  const token = actionToken(linkToken || manualToken);
  const emailValid = z.email().safeParse(email.trim()).success;

  const run = async (confirm: boolean) => {
    if (busy) return;

    if (confirm ? !token : !emailValid) {
      setError(
        confirm
          ? "Open your verification link or enter its token."
          : "Enter a valid email address.",
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (confirm) {
        await api.auth.confirmEmailVerification(token);
        setDone(true);
        setManualToken("");
        router.setParams({ token: undefined });
        await useSession.getState().refreshUser();
        toast.success("Email verified.");
      } else {
        await api.auth.requestEmailVerification(email.trim());
        setSent(true);
        toast.success("Verification email requested. Check your inbox.");
      }
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthShell
        title="Email verified"
        subtitle="Your email address has been confirmed."
        footer={
          <AuthLink
            label={user ? "Back to account" : "Back to sign in"}
            onPress={() => router.replace(user ? "/user" : "/signin")}
          />
        }
      >
        <Banner tone="success" message="Verification complete." />
        <Button
          label={user ? "Go to account" : "Go to sign in"}
          size="lg"
          icon="checkmark-circle-outline"
          onPress={() => router.replace(user ? "/user" : "/signin")}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle="Confirm your email to keep your account up to date."
      footer={
        <AuthLink
          label={user ? "Back to account" : "Back to sign in"}
          onPress={() => router.replace(user ? "/user" : "/signin")}
        />
      }
    >
      {error ? <Banner tone="danger" message={error} /> : null}

      {linkToken ? (
        <Banner tone="info" message="Your link is ready. Confirm below to verify your email." />
      ) : (
        <>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />

          <Button
            label={sent ? "Resend verification email" : "Send verification email"}
            icon="mail-outline"
            variant="secondary"
            loading={busy}
            disabled={!emailValid}
            onPress={() => run(false)}
          />

          {sent ? (
            <Banner
              tone="info"
              message="If verification is needed for this account, an email will arrive shortly."
            />
          ) : null}

          <Field
            label="Verification link or token"
            value={manualToken}
            onChangeText={setManualToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="Paste the code from your email"
            hint="Open the link on this device, or paste the code it contains."
          />
        </>
      )}

      <Button
        label="Verify email"
        icon="checkmark-circle-outline"
        loading={busy}
        size="lg"
        disabled={!token}
        onPress={() => run(true)}
      />
    </AuthShell>
  );
}
