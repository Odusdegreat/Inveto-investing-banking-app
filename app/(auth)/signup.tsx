import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { AuthLink, AuthShell, Field } from "@/src/components/AuthShell";
import { Banner, Button } from "@/src/components/ui";
import { api } from "@/src/api/client";

const schema = z.object({
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
});

type Values = z.infer<typeof schema>;

export default function SignUp() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    await api.user
      .update({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
      })
      .catch(() => undefined);
    setDone(true);
  });

  if (done) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`We sent a verification link to your email. Once confirmed, sign in to continue.`}
        footer={<AuthLink label="Back to sign in" onPress={() => router.replace("/signin")} />}
      >
        <Banner tone="success" message="Account created. Verification is simulated in this build." />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to open. Takes about two minutes."
      footer={<AuthLink label="I already have an account" onPress={() => router.replace("/signin")} />}
    >
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
            placeholder="At least 8 characters"
            hint="Use 8+ characters with a letter and a number."
          />
        )}
      />
      <Button label="Create account" size="lg" onPress={onSubmit} />
    </AuthShell>
  );
}
