import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { Modal, StyleSheet, Text, View, Pressable, SafeAreaView, StatusBar, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { AuthLink, Field } from "@/src/components/AuthShell";
import { Banner, Button, Card } from "@/src/components/ui";
import { Logo } from "@/src/components/marks";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useSession } from "@/src/store/session";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "At least 6 characters"),
});

type Values = z.infer<typeof schema>;

interface SignInModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SignInModal({ visible, onClose, onSuccess }: SignInModalProps) {
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
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (visible) {
      reset({ email: "", password: "" });
      setCode("");
      clearError();
      setLocalError(null);
    }
  }, [visible, reset, clearError]);

  const onSubmit = handleSubmit(async (values) => {
    setLocalError(null);
    clearError();
    const ok = await signIn(values.email, values.password);
    if (!ok) return;
    onSuccess();
  });

  const onVerify = async () => {
    setLocalError(null);
    clearError();
    if (await verifyTwoFactor(code)) {
      onSuccess();
    }
  };

  const backToPassword = () => {
    useSession.setState({ challengeToken: null, error: null });
    setCode("");
  };

  const message = localError ?? sessionError;

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingTop: 64,
      paddingBottom: 56,
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginBottom: 32,
    },
    brandName: {
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: 1,
      color: colors.text,
    },
    heading: {
      gap: 10,
      marginBottom: 36,
    },
    title: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textMuted,
    },
    body: {
      gap: 22,
    },
    footer: {
      marginTop: 36,
      gap: 20,
    },
    stepCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
      padding: 18,
      backgroundColor: colors.surface,
    },
    stepIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
    },
    stepText: {
      flex: 1,
      gap: 6,
    },
    footerText: {
      fontSize: 15,
      textAlign: "center",
      color: colors.textSubtle,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar
            backgroundColor={colors.background}
            barStyle={colors.background === "#FFFFFF" || colors.background === "#F1F5F9" ? "dark-content" : "light-content"}
            translucent={false}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, backgroundColor: colors.background }}
          >
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.brand}>
                <Logo size={36} />
                <Text style={styles.brandName}>INVETO</Text>
              </View>

              <View style={styles.heading}>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Sign in to manage your money.</Text>
              </View>

              <View style={styles.body}>
                {message ? <Banner tone="danger" message={message} /> : null}

                {challengeToken ? (
                  <>
                    <Card style={styles.stepCard}>
                      <View style={styles.stepIcon}>
                        <Ionicons name="shield-checkmark-outline" size={22} color={colors.accent} />
                      </View>
                      <View style={styles.stepText}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                          Two-factor authentication
                        </Text>
                        <Text style={{ color: colors.textSubtle, fontSize: 13, lineHeight: 19 }}>
                          Enter the 6-digit code from your authenticator app to finish signing in.
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
                            onPress: () => {
                              onClose();
                            },
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

                <View style={styles.footer}>
                  <AuthLink
                    label="Forgot your password?"
                    onPress={() => {
                      onClose();
                    }}
                  />
                  <Text style={styles.footerText}>
                    New here?{" "}
                    <Text
                      onPress={() => {
                        onClose();
                      }}
                      suppressHighlighting
                      style={{ color: colors.accent, fontWeight: "700" }}
                    >
                      Create an account
                    </Text>
                  </Text>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}