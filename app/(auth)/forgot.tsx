import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { AuthLink, AuthShell, Field } from "@/src/components/AuthShell";
import { Banner, Button } from "@/src/components/ui";
import { ApiError, api } from "@/src/api/client";

const schema = z.object({
  email: z.email("Enter a valid email address"),
});

type Values = z.infer<typeof schema>;

export default function ForgotPassword() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await api.auth.requestPasswordReset(values.email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the email");
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
        <Banner tone="success" message="Reset link sent. It expires in 30 minutes." />
        <Button
          label="Resend email"
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
            placeholder="you@example.com"
          />
        )}
      />

      <Button label="Send reset link" size="lg" onPress={onSubmit} />
    </AuthShell>
  );
}
