import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { AuthLink, AuthShell, Field } from "@/src/components/AuthShell";
import { Banner, Button } from "@/src/components/ui";
import { toast } from "@/src/components/Toast";
import { ApiError, api } from "@/src/api/client";

const schema = z.object({
  email: z.email("Enter a valid email address"),
});

type Values = z.infer<typeof schema>;

export default function ForgotPassword() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.requestPasswordReset(values.email.trim());
      setSent(true);
      toast.success("Reset email requested. Check your inbox.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not send the email";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  });

  if (sent) {
    const email = getValues("email");

    return (
      <AuthShell
        title="Check your email"
        subtitle={`If an account exists for ${email}, a reset link is on its way.`}
        footer={<AuthLink label="Back to sign in" onPress={() => router.replace("/signin")} />}
      >
        {error ? <Banner tone="danger" message={error} /> : null}
        <Banner
          tone="success"
          message="If the email matches an account, a reset link will arrive shortly."
        />

        <Button
          label="I have a reset link"
          size="lg"
          icon="link-outline"
          onPress={() => router.push("/reset-password")}
        />

        <Button
          label={error ? "Try sending again" : "Resend email"}
          loading={busy}
          variant="secondary"
          onPress={() => void onSubmit()}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a secure link to set a new one."
      footer={<AuthLink label="Back to sign in" onPress={() => router.replace("/signin")} />}
    >
      {error ? <Banner tone="danger" message={error} /> : null}

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Field
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
            hint="Use the email address you registered with."
          />
        )}
      />

      <Button
        label="Send reset link"
        icon="mail-outline"
        loading={busy}
        size="lg"
        onPress={onSubmit}
      />
    </AuthShell>
  );
}
