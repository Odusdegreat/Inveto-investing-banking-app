import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { AuthLink, AuthShell, Field } from "@/src/components/AuthShell";
import { Banner, Button } from "@/src/components/ui";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useSession } from "@/src/store/session";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "At least 6 characters"),
});

type Values = z.infer<typeof schema>;

export default function SignIn() {
  const router = useRouter();
  const { colors } = useTheme();
  const signIn = useSession((s) => s.signIn);
  const busy = useSession((s) => s.busy);
  const sessionError = useSession((s) => s.error);
  const clearError = useSession((s) => s.clearError);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "odue@inveto.app", password: "inveto123" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setLocalError(null);
    clearError();
    const ok = await signIn(values.email, values.password);
    if (!ok) return;
    router.replace("/home");
  });

  const message = localError ?? sessionError;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your money."
      footer={
        <View>
          <AuthLink label="Forgot your password?" onPress={() => router.push("/forgot")} />
          <Text
            style={{
              color: colors.textSubtle,
              fontSize: 14,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            New here?{" "}
            <Text
              onPress={() => router.push("/signup")}
              suppressHighlighting
              style={{ color: colors.accent, fontWeight: "700" }}
            >
              Create an account
            </Text>
          </Text>
        </View>
      }
    >
      {message ? <Banner tone="danger" message={message} /> : null}

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
            textContentType="emailAddress"
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
            autoComplete="current-password"
            placeholder="••••••••"
            textContentType="password"
            hint="Demo build — any 6+ character password works."
          />
        )}
      />

      <Button
        label="Sign in"
        size="lg"
        loading={busy}
        onPress={onSubmit}
      />
    </AuthShell>
  );
}
