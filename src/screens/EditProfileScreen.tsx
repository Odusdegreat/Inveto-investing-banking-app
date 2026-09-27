import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";

import { ApiError, api } from "@/src/api/client";
import { Field } from "@/src/components/AuthShell";
import {
  Banner,
  Button,
  Card,
  ErrorState,
  HeaderBar,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { useSession } from "@/src/store/session";
import { useTheme } from "@/src/theme/ThemeProvider";

const schema = z.object({
  fullName: z.string().min(2, "Tell us your name"),
  email: z.email("Enter a valid email address"),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .regex(/^[+\d][\d\s-]{8,}$/, "Enter a valid phone number"),
});

type Values = z.infer<typeof schema>;

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: user, loading, error, reload } = useApi(() => api.user.get(), []);
  const refreshUser = useSession((s) => s.refreshUser);

  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      });
    }
  }, [reset, user]);

  const onSubmit = handleSubmit(async (values) => {
    setFailure(null);
    setSaved(false);
    setBusy(true);
    try {
      await api.user.update(values);
      await refreshUser();
      setSaved(true);
      reset(values);
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setBusy(false);
    }
  });

  return (
    <Screen>
      <HeaderBar title="Edit profile" onBack={() => router.back()} />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {saved ? <Banner tone="success" message="Profile updated" /> : null}
      {failure ? <Banner tone="danger" message={failure} /> : null}

      {loading && !user ? (
        <Card style={{ padding: 18, gap: 16 }}>
          <Skeleton height={16} width="30%" />
          <Skeleton height={50} />
          <Skeleton height={16} width="30%" />
          <Skeleton height={50} />
        </Card>
      ) : (
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <View>
              <SectionHeader title="Personal details" />
              <View style={{ gap: 14 }}>
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
              </View>
            </View>
          )}
        />
      )}

      {user ? (
        <View style={{ marginTop: 24, gap: 12 }}>
          <Button
            label={busy ? "Saving" : "Save changes"}
            size="lg"
            loading={busy}
            disabled={!isDirty}
            onPress={onSubmit}
          />
          <Text
            style={{
              color: colors.textSubtle,
              fontSize: 12,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            Member since{" "}
            {new Date(user.memberSince).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
            . Some changes may require re-verification once a backend is
            connected.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
