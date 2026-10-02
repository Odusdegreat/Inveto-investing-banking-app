import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Pressable, Text, TextInput, View, Animated, Keyboard, StyleSheet, Modal, ActivityIndicator } from "react-native";
import * as Haptics from "expo-haptics";
import { WebView } from "react-native-webview";

import { api } from "@/src/api/client";
import { toast } from "@/src/components/Toast";
import {
  Banner,
  Button,
  Card,
  HeaderBar,
  ListCard,
  Screen,
  Section,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatMoney, maskAccountNumber } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import { currencySymbol, DEFAULT_CURRENCY } from "@/src/lib/currency";
import { DemoBanner } from "@/src/components/DemoBanner";
import type { SandboxTopUp as SandboxTopUpType } from "@/src/types";
import { downloadAndShareReceipt, generateReceiptHTML, type ReceiptTheme } from "@/src/lib/pdf";
import type { Transaction, TransactionCategory, TransactionStatus } from "@/src/types";

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

export default function SandboxTopUp() {
  const router = useRouter();
  const { colors } = useTheme();

  const accounts = useApi(() => api.accounts.list(), []);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toppingUp, setToppingUp] = useState(false);
  const [receipt, setReceipt] = useState<SandboxTopUpType | null>(null);
  const [focused, setFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const amount = Number(raw.replace(/[^0-9.]/g, "")) || 0;
  const isValidAmount = amount > 0;
  const hasAccounts = accounts.data && accounts.data.length > 0;

  const source = useMemo(
    () => accounts.data?.find((a) => a.id === selectedAccountId) ?? accounts.data?.[0],
    [accounts.data, selectedAccountId],
  );

  const effectiveCurrency = source?.currency ?? DEFAULT_CURRENCY;
  const effectiveSymbol = currencySymbol(effectiveCurrency);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setFocused(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setFocused(false);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const simulateSuccess = async () => {
    if (toppingUp || !source || !isValidAmount) return;
    setError(null);
    setToppingUp(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      const key = `topup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await api.sandbox.topUp({ accountId: source.id, amount, currency: effectiveCurrency }, key);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setReceipt(result);
      toast.success("Top-up successful");
      setRaw("");
      setSelectedAccountId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Top-up failed");
      setError(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setToppingUp(false);
    }
  };

  const simulateFail = async () => {
    if (toppingUp || !source || !isValidAmount) return;
    setError(null);
    setToppingUp(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      throw new Error("Simulated payment failure: Insufficient funds");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulated failure");
      setError(err instanceof Error ? err.message : "Simulated failure");
    } finally {
      setToppingUp(false);
    }
  };

  const handlePresetPress = (value: number) => {
    setRaw(String(value));
    Haptics.selectionAsync().catch(() => undefined);
  };

  const handleAccountPress = (accountId: string) => {
    setSelectedAccountId(accountId);
    Haptics.selectionAsync().catch(() => undefined);
  };

  const styles = StyleSheet.create({
    amountCard: {
      padding: 24,
      gap: 20,
    },
    amountInputWrapper: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    currencySymbol: {
      fontSize: 36,
      fontWeight: "700",
      marginBottom: 4,
    },
    amountInput: {
      flex: 1,
      color: colors.text,
      fontSize: 44,
      fontWeight: "800",
      padding: 0,
      textAlign: "right",
      minWidth: 0,
    },
    presetsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    presetButton: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      minWidth: 80,
      alignItems: "center",
    },
    presetText: {
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    accountCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
    },
    accountLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      flex: 1,
    },
    accountAvatar: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    accountInfo: {
      gap: 4,
    },
    accountMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    metaDivider: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    accountRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    activeIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "currentColor",
    },
    actionButtons: {
      marginTop: 8,
      gap: 10,
      paddingHorizontal: 4,
    },
    emptyState: {
      alignItems: "center",
      padding: 40,
      gap: 12,
      borderStyle: "dashed",
      borderWidth: 2,
      borderColor: colors.border,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "600",
    },
    emptySubtitle: {
      color: colors.textSubtle,
      fontSize: 14,
      textAlign: "center",
    },
    successCard: {
      padding: 28,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.overlay,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
      gap: 24,
    },
    successIcon: {
      alignItems: "center",
      marginTop: 8,
    },
    successTitle: {
      color: colors.text,
      fontSize: 26,
      fontWeight: "800",
      textAlign: "center",
    },
    successAmount: {
      color: colors.text,
      fontSize: 44,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: -1,
    },
    successSubtitle: {
      color: colors.textSubtle,
      fontSize: 16,
      textAlign: "center",
    },
    referenceCard: {
      backgroundColor: colors.surfaceSunken,
      borderRadius: 16,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    referenceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    referenceLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      flexShrink: 0,
    },
    referenceValue: {
      color: colors.text,
      fontSize: 13,
      fontFamily: "monospace",
      fontWeight: "500",
      flexShrink: 1,
      flexWrap: "wrap",
      textAlign: "right",
      paddingRight: 8,
    },
    demoBadge: {
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 9999,
      backgroundColor: colors.warningSoft,
      alignSelf: "center",
    },
    demoBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: colors.warningText,
      letterSpacing: 1.5,
    },
    buttonGroup: {
      marginTop: 8,
      gap: 12,
    },
    disclaimer: {
      color: colors.textSubtle,
      fontSize: 12,
      textAlign: "center",
      marginTop: 8,
    },
    footerNote: {
      color: colors.textSubtle,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
      marginTop: -8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    modalContainer: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      overflow: "hidden",
      flex: 1,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    modalWebViewContainer: {
      flex: 1,
      position: "relative",
    },
    modalWebView: {
      flex: 1,
    },
    modalLoading: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
  });

  const generateReceipt = async () => {
    if (!receipt || !source) return;
    try {
      setGeneratingReceipt(true);
      const transaction: Transaction = {
        id: receipt.id,
        reference: receipt.id,
        title: "Add Money",
        description: "Demo top-up",
        amount: receipt.amount,
        currency: receipt.currency as any,
        kind: "deposit",
        category: "topup" as TransactionCategory,
        status: "completed" as TransactionStatus,
        createdAt: receipt.createdAt || new Date().toISOString(),
        counterparty: source.name,
        cardLast4: null,
        accountId: source.id,
      };
      const theme: ReceiptTheme = {
        background: colors.background,
        surface: colors.surface,
        text: colors.text,
        textMuted: colors.textMuted,
        textSubtle: colors.textSubtle,
        border: colors.border,
        accent: colors.accent,
        accentPressed: colors.accentPressed,
        danger: colors.danger,
        dangerSoft: colors.dangerSoft,
        success: colors.success,
        warning: colors.warning,
        warningText: colors.warningText,
        warningSoft: colors.warningSoft,
      };
      const html = generateReceiptHTML(transaction, source.name, true, theme);
      await downloadAndShareReceipt(html);
    } catch (error) {
      toast.error("Failed to generate receipt");
      console.error("Receipt generation error:", error);
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [viewReceiptHtml, setViewReceiptHtml] = useState<string | null>(null);
  const [webViewLoading, setWebViewLoading] = useState(false);

  const handleViewReceipt = () => {
    if (!receipt || !source) return;
    const transaction: Transaction = {
      id: receipt.id,
      reference: receipt.id,
      title: "Add Money",
      description: "Demo top-up",
      amount: receipt.amount,
      currency: receipt.currency as any,
      kind: "deposit",
      category: "topup" as TransactionCategory,
      status: "completed" as TransactionStatus,
      createdAt: receipt.createdAt || new Date().toISOString(),
      counterparty: source.name,
      cardLast4: null,
      accountId: source.id,
    };
    const theme: ReceiptTheme = {
      background: colors.background,
      surface: colors.surface,
      text: colors.text,
      textMuted: colors.textMuted,
      textSubtle: colors.textSubtle,
      border: colors.border,
      accent: colors.accent,
      accentPressed: colors.accentPressed,
      danger: colors.danger,
      dangerSoft: colors.dangerSoft,
      success: colors.success,
      warning: colors.warning,
      warningText: colors.warningText,
      warningSoft: colors.warningSoft,
    };
    const html = generateReceiptHTML(transaction, source.name, true, theme);
    setViewReceiptHtml(html);
    setWebViewLoading(true);
  };

  if (receipt) {
    return (
      <Screen contentStyle={{ flex: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 }} gap={28}>
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={88} color={colors.accent} />
          </View>
          <Text style={styles.successTitle}>Money Added</Text>
          <Text style={styles.successAmount}>
            {formatMoney(receipt.amount, receipt.currency)}
          </Text>
          <Text style={styles.successSubtitle}>
            To {source?.name ?? "your account"}
          </Text>
          
          <View style={styles.referenceCard}>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Reference</Text>
              <Text style={styles.referenceValue} selectable>{receipt.id}</Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Date</Text>
              <Text style={styles.referenceValue}>
                {new Date(receipt.createdAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceLabel}>Time</Text>
              <Text style={styles.referenceValue}>
                {new Date(receipt.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          </View>

          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>DEMO MODE</Text>
          </View>

          <View style={styles.buttonGroup} gap={12}>
            <Button
              label="View Receipt"
              size="lg"
              icon="eye-outline"
              variant="outline"
              onPress={handleViewReceipt}
              style={{ width: "100%" }}
            />
            <Button
              label="Share Receipt"
              size="lg"
              icon="share-outline"
              loading={generatingReceipt}
              disabled={generatingReceipt}
              onPress={generateReceipt}
              style={{ width: "100%" }}
            />
            <Button
              label="Done"
              size="lg"
              variant="ghost"
              onPress={() => router.replace("/home")}
              style={{ width: "100%" }}
            />
          </View>

          <Text style={styles.disclaimer}>
            Simulated transaction. No real money was moved.
          </Text>
        </View>
      </Screen>
    );
  }

  if (viewReceiptHtml) {
    return (
      <Modal
        visible
        animationType="slide"
        transparent
        onRequestClose={() => setViewReceiptHtml(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receipt</Text>
              <Pressable
                onPress={() => setViewReceiptHtml(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close receipt"
              >
                <Ionicons name="close" size={28} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.modalWebViewContainer}>
              <WebView
                originWhitelist={["*"]}
                source={{ html: viewReceiptHtml }}
                style={styles.modalWebView}
                onLoadEnd={() => setWebViewLoading(false)}
                onError={() => setWebViewLoading(false)}
                backgroundColor={colors.background}
              />
              {webViewLoading && (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Screen style={{ flex: 1, paddingBottom: keyboardHeight > 0 ? 20 : 0 }} gap={20}>
      <HeaderBar title="Add Money" onBack={() => router.back()} />
      <DemoBanner />

      {error ? (
        <Banner tone="danger" message={error} />
      ) : null}

      <Card style={styles.amountCard}>
        <SectionHeader title="Amount" />

        <View style={styles.amountInputWrapper}>
          <Text style={[styles.currencySymbol, { color: focused ? colors.accent : colors.textMuted }]}>
            {effectiveSymbol}
          </Text>
          <TextInput
            value={raw}
            onChangeText={setRaw}
            placeholder="0.00"
            placeholderTextColor={colors.textSubtle}
            keyboardType="decimal-pad"
            accessibilityLabel="Top-up amount"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.amountInput}
            autoFocus
          />
        </View>

        <View style={styles.presetsContainer}>
          {PRESET_AMOUNTS.map((preset) => (
            <Pressable
              key={preset}
              onPress={() => handlePresetPress(preset)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${formatMoney(preset, effectiveCurrency, { compact: true })}`}
              style={({ pressed }) => [
                styles.presetButton,
                {
                  backgroundColor: pressed ? colors.accentSoft : colors.surface,
                  borderColor: amount === preset ? colors.accent : colors.border,
                  borderWidth: amount === preset ? 2 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: amount === preset ? colors.accent : colors.text },
                ]}
              >
                {formatMoney(preset, effectiveCurrency, { compact: true })}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {hasAccounts && (
        <Section title="Select Account" gap={10}>
          {accounts.loading ? (
            <Card style={{ padding: 20, alignItems: "center" }}>
              <Skeleton height={20} width={120} />
            </Card>
          ) : (
            <ListCard>
              {accounts.data?.map((account) => {
                const active = source?.id === account.id;
                const balance = account.balance ?? 0;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => handleAccountPress(account.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.accountCard,
                      {
                        borderColor: active ? colors.accent : colors.border,
                        backgroundColor: pressed
                          ? colors.surfaceRaised
                          : active
                          ? colors.accentSoft
                          : colors.surface,
                        borderWidth: active ? 2 : 1,
                        shadowColor: active ? colors.accent : "transparent",
                        shadowOpacity: active ? 0.15 : 0,
                        shadowRadius: active ? 8 : 0,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: active ? 4 : 0,
                      },
                    ]}
                  >
                    <View style={styles.accountLeft}>
                      <View
                        style={[
                          styles.accountAvatar,
                          { backgroundColor: active ? colors.accent : colors.surfaceRaised },
                        ]}
                      >
                        <Text
                          style={{
                            color: active ? colors.text : colors.textMuted,
                            fontWeight: "800",
                            fontSize: 14,
                          }}
                        >
                          {account.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.accountInfo}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                          {account.name}
                        </Text>
                        <View style={styles.accountMeta}>
                          <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                            {maskAccountNumber(account.number)}
                          </Text>
                          <View style={styles.metaDivider} />
                          <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
                            {formatMoney(balance, account.currency)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.accountRight}>
                      <Ionicons
                        name={active ? "radio-button-on" : "radio-button-off"}
                        size={24}
                        color={active ? colors.accent : colors.border}
                      />
                      {active && (
                        <View style={styles.activeIndicator} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ListCard>
          )}
        </Section>
      )}

      {!hasAccounts && !accounts.loading && (
        <Card style={styles.emptyState}>
          <Ionicons name="card-outline" size={40} color={colors.textSubtle} />
          <Text style={styles.emptyTitle}>No accounts yet</Text>
          <Text style={styles.emptySubtitle}>
            Create an account to start adding money
          </Text>
        </Card>
      )}

      <View style={styles.actionButtons} pointerEvents={toppingUp ? "none" : "auto"}>
        <Button
          label={toppingUp ? "Adding money..." : "Add Money"}
          size="lg"
          loading={toppingUp}
          disabled={toppingUp || !source || !isValidAmount}
          onPress={simulateSuccess}
          style={{ width: "100%" }}
        />
        <Button
          label="Simulate Failure"
          size="lg"
          variant="ghost"
          disabled={toppingUp || !source || !isValidAmount}
          onPress={simulateFail}
          style={{ width: "100%", marginTop: 10 }}
        />
      </View>

      <Text style={styles.footerNote}>
        Demo mode — no real money is moved
      </Text>
    </Screen>
  );
}