import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  AuthLink,
  AuthShell,
  Field,
  PasswordRules,
  PasswordStrength,
} from "@/src/components/AuthShell";
import { Banner, Button } from "@/src/components/ui";
import { toast } from "@/src/components/Toast";
import { useTheme } from "@/src/theme/ThemeProvider";
import { api } from "@/src/api/client";

const schema = z
  .object({
    fullName: z.string().min(2, "Tell us your name"),
    email: z.email("Enter a valid email address"),
    phone: z
      .string()
      .min(10, "Enter a valid phone number")
      .regex(/^[+\d][\d\s-]{8,}$/, "Enter a valid phone number"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/\d/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Values = z.infer<typeof schema>;

export default function SignUp() {
  const router = useRouter();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({ control, name: "password" });

  const onSubmit = handleSubmit(async ({ confirmPassword, ...values }) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.auth.register(values);
      setDone(true);
      toast.success("Account created.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create account";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  });

  if (done) {
    return (
      <AuthShell
        title="Account created"
        subtitle="One quick step left before you can start investing."
        footer={<AuthLink label="Back to sign in" onPress={() => router.replace("/signin")} />}
      >
        <Banner tone="success" message="Your account has been created." />
        <Button
          label="Verify my email"
          size="lg"
          icon="mail-outline"
          onPress={() => router.push("/verify-email")}
        />
        <Text style={[styles.footnote, { color: colors.textSubtle }]}>
          We sent a verification link to your inbox. Open it on this device to confirm
          your address.
        </Text>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to open. Takes about two minutes."
      footer={<AuthLink label="I already have an account" onPress={() => router.replace("/signin")} />}
    >
      {error ? <Banner tone="danger" message={error} /> : null}

      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <Field
            label="Full name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.fullName?.message}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            placeholder="Odue Asare"
          />
        )}
      />

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
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <Field
            label="Phone"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.phone?.message}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="+1 555 010 2288"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Field
            label="Password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.password?.message}
            secureTextEntry
            autoComplete="new-password"
            placeholder="Create a password"
            footer={
              password ? (
                <View style={styles.passwordMeta}>
                  <PasswordStrength value={password} />
                  <PasswordRules value={password} />
                </View>
              ) : null
            }
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <Field
            label="Confirm password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.confirmPassword?.message}
            secureTextEntry
            autoComplete="new-password"
            placeholder="Re-enter your password"
          />
        )}
      />

      <Button
        label="Create account"
        size="lg"
        loading={busy}
        onPress={onSubmit}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  passwordMeta: {
    gap: 16,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
