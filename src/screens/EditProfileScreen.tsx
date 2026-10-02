import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";
import { z } from "zod";

import { toast } from "@/src/components/Toast";
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
  Stack,
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
      toast.success("Profile saved.");
      reset(values);
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setBusy(false);
    }
  });

  return (
    <Screen gap={22}>
      <HeaderBar title="Edit profile" onBack={() => router.back()} />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {saved ? <Banner tone="success" message="Profile updated" /> : null}
      {failure ? <Banner tone="danger" message={failure} /> : null}

      {loading && !user ? (
        <Card style={{ padding: 20, gap: 18 }}>
          <Skeleton height={16} width="30%" />
          <Skeleton height={56} />
          <Skeleton height={16} width="30%" />
          <Skeleton height={56} />
        </Card>
      ) : (
        <Stack gap={20}>
          <SectionHeader title="Personal details" />
          {(["fullName", "email", "phone"] as const).map((name) => (
            <Controller key={name} control={control} name={name} render={({ field }) => (
              <Field
                label={name === "fullName" ? "Full name" : name === "email" ? "Email" : "Phone"}
                value={field.value ?? ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors[name]?.message}
                keyboardType={name === "email" ? "email-address" : name === "phone" ? "phone-pad" : "default"}
                autoCapitalize={name === "fullName" ? "words" : "none"}
                autoComplete={name === "fullName" ? "name" : name === "email" ? "email" : "tel"}
                textContentType={name === "fullName" ? "name" : name === "email" ? "emailAddress" : "telephoneNumber"}
                placeholder={name === "fullName" ? "Odue Asare" : name === "email" ? "you@example.com" : "+1 555 010 2288"}
              />
            )} />
          ))}
          <Button
            label="Verify email address"
            variant="ghost"
            icon="mail-outline"
            onPress={() => router.push("/verify-email")}
          />
        </Stack>
      )}

      {user ? (
        <Stack gap={14}>
          <Button
            label="Save changes"
            size="lg"
            loading={busy}
            disabled={!isDirty}
            onPress={onSubmit}
          />
          <Text style={[styles.footnote, { color: colors.textSubtle }]}>
            Member since{" "}
            {new Date(user.memberSince).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
            . Email changes may require verification.
          </Text>
        </Stack>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footnote: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
