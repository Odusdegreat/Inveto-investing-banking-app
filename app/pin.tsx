import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ApiError, api } from "@/src/api/client";
import { Banner, Button } from "@/src/components/ui";
import { cancelStepUp, resolveStepUp, pendingStepUpAction } from "@/src/lib/stepUp";
import { useTheme } from "@/src/theme/ThemeProvider";

import { confirmWithPasskey, passkeySupported } from "@/src/lib/passkeys";
import { useApi } from "@/src/hooks/useApi";

const PIN_LENGTH = 4;

export default function ConfirmPin() {
  const router = useRouter();
  const { colors } = useTheme();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const security = useApi(() => api.security.get(), []);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  /**
   * If the screen is dismissed without a successful verify — back gesture,
   * header back button, hardware back — the awaiting action must not hang.
   */
  useEffect(() => cancelStepUp, []);

  const submit = useCallback(
    async (value: string) => {
      setChecking(true);
      setError(null);
      try {
        const action = pendingStepUpAction();
        if (!action) throw new ApiError("cancelled", "Start the operation again to confirm it.");
        const { stepUpToken } = await api.auth.verifyPin(value, action);
        resolveStepUp(stepUpToken);
        router.back();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not verify PIN");
        setPin("");
        setChecking(false);
      }
    },
    [router],
  );

  const press = (digit: string) => {
    if (pin.length >= PIN_LENGTH || checking) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      void submit(next);
    }
  };

  const dismiss = () => {
    cancelStepUp();
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ gap: 8, alignItems: "center" }}>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={26} color={colors.accent} />
        </View>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
          Confirm it is you
        </Text>
        <Text
          style={{
            color: colors.textSubtle,
            fontSize: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {reason ?? "Enter your transaction PIN to continue."}
        </Text>
      </View>

      <View
        style={styles.dots}
        accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                borderColor: colors.border,
                backgroundColor: index < pin.length ? colors.accent : "transparent",
              },
            ]}
          />
        ))}
      </View>

      {error ? <Banner tone="danger" message={error} /> : null}

      <View style={styles.pad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <Key key={digit} label={digit} onPress={() => press(digit)} />
        ))}
        <Key label="" disabled />
        <Key label="0" onPress={() => press("0")} />
        <Key
          icon="backspace-outline"
          label="Delete"
          onPress={() => setPin((current) => current.slice(0, -1))}
        />
      </View>

      {security.data?.biometricsEnabled && passkeySupported() ? <Button label="Use a passkey" variant="secondary" icon="finger-print-outline" loading={checking} onPress={async () => {
        if (checking) return;
        const action = pendingStepUpAction();
        if (!action) return;
        setChecking(true);
        setError(null);
        try {
          const { stepUpToken } = await confirmWithPasskey(action);
          resolveStepUp(stepUpToken);
          router.back();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Passkey confirmation failed");
          setChecking(false);
        }
      }} /> : null}
      <Button label="Cancel" variant="ghost" onPress={dismiss} />
    </View>
  );
}

function Key({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.key,
        {
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.3 : 1,
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={22} color={colors.text} />
      ) : (
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "600" }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingHorizontal: 32,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dots: { flexDirection: "row", gap: 14 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center",
    maxWidth: 280,
  },
  key: {
    width: 76,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
