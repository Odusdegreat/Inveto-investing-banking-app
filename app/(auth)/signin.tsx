import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { AuthLink, AuthShell, Field } from "@/src/components/AuthShell";
import { Banner, Button, Card } from "@/src/components/ui";
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
  const challengeToken = useSession((s) => s.challengeToken);
  const verifyTwoFactor = useSession((s) => s.verifyTwoFactor);
  const signIn = useSession((s) => s.signIn);
  const busy = useSession((s) => s.busy);
  const sessionError = useSession((s) => s.error);
  const clearError = useSession((s) => s.clearError);
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setLocalError(null);
    clearError();
    const ok = await signIn(values.email, values.password);
    if (!ok) return;
    router.replace("/home");
  });

  const onVerify = async () => {
    setLocalError(null);
    clearError();
    if (await verifyTwoFactor(code)) router.replace("/home");
  };

  const backToPassword = () => {
    useSession.setState({ challengeToken: null, error: null });
    setCode("");
  };

  const message = localError ?? sessionError;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your money."
      footer={
        <View style={styles.footer}>
          <AuthLink
            label="Forgot your password?"
            onPress={() => router.push("/forgot")}
          />
          <Text style={[styles.footerText, { color: colors.textSubtle }]}>
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

      {challengeToken ? (
        <>
          <Card style={styles.stepCard}>
            <View style={[styles.stepIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.accent} />
            </View>
            <View style={styles.stepText}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Two-factor authentication
              </Text>
              <Text
                style={{ color: colors.textSubtle, fontSize: 13, lineHeight: 19 }}
              >
                Enter the 6-digit code from your authenticator app to finish signing
                in.
              </Text>
            </View>
          </Card>

          <Field
            label="Authenticator code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            action={{ label: "Use password instead", onPress: backToPassword }}
          />

          <Button
            label="Verify code"
            size="lg"
            icon="checkmark-circle-outline"
            loading={busy}
            disabled={code.length < 6}
            onPress={onVerify}
          />
        </>
      ) : (
        <>
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
                placeholder="Enter your password"
                textContentType="password"
                action={{
                  label: "Forgot password?",
                  onPress: () => router.push("/forgot"),
                }}
              />
            )}
          />

          <Button
            label="Sign in"
            size="lg"
            icon="log-in-outline"
            loading={busy}
            onPress={onSubmit}
          />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 24,
  },
  footerText: {
    fontSize: 15,
    textAlign: "center",
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
  },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
    gap: 6,
  },
});
