import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Text, View } from "react-native";

import { PickerRow, StatStrip, StatTile, ToggleGroup, ToggleRow } from "@/src/components/insights";
import {
  Banner,
  Button,
  Card,
  Divider,
  HeaderBar,
  ListCard,
  Row,
  Screen,
  Section,
  rowTextInset,
} from "@/src/components/ui";
import { toast } from "@/src/components/Toast";
import { useCurrency } from "@/src/hooks/useCurrency";
import { CURRENCIES, CURRENCY_CODES, currencyName } from "@/src/lib/currency";
import { formatMoney } from "@/src/lib/format";
import { useBanking } from "@/src/store/banking";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useSession } from "@/src/store/session";

const ACCOUNTS = ["Everyday current", "High-yield savings", "Investment wallet"];

const QUICK_AMOUNTS = [10, 25, 50, 100];

export default function AdvancedSettingsScreen() {
  const router = useRouter();
  const { colors, dark, preference, setPreference } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const settings = useBanking((s) => s.settings);
  const setSetting = useBanking((s) => s.setSetting);
  const resetDemoData = useBanking((s) => s.resetDemoData);
  const signOut = useSession((s) => s.signOut);

  const enabledCount = Object.values(settings).filter((value) => value === true).length;

  const confirmReset = () => {
    Alert.alert(
      "Reset demo data?",
      "Every locally held goal, bill, budget, ticket and setting goes back to its starting value. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetDemoData },
      ],
    );
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You will need to sign in again to access your account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/signin");
        },
      },
    ]);
  };

  return (
    <Screen gap={24}>
      <HeaderBar title="Advanced settings" onBack={() => router.back()} />

      <Card style={{ padding: 18 }}>
        <StatStrip>
          <StatTile
            label="Toggles on"
            value={`${enabledCount}`}
            hint="Of all settings"
          />
          <StatTile label="Theme" value={dark ? "Dark" : "Light"} hint={preference} />
          <StatTile label="Currency" value={currency} hint={currencyName(currency)} />
        </StatStrip>
      </Card>

      <ToggleGroup title="Privacy">
        {[
          {
            key: "hide",
            node: (
              <ToggleRow
                title="Hide balances"
                subtitle="Blur amounts until you tap to reveal them"
                icon="eye-off-outline"
                value={settings.hideBalances}
                onChange={(next) => setSetting("hideBalances", next)}
              />
            ),
          },
        ]}
      </ToggleGroup>

      <ToggleGroup title="Saving">
        {[
          {
            key: "roundup",
            node: (
              <ToggleRow
                title="Round up card spending"
                subtitle="Round each card payment up and save the difference"
                icon="arrow-up-circle-outline"
                value={settings.roundUpSavings}
                onChange={(next) => setSetting("roundUpSavings", next)}
              />
            ),
          },
          {
            key: "roundupAccount",
            node: (
              <PickerRow
                title="Round-ups go to"
                subtitle="Where the spare change lands"
                icon="wallet-outline"
                value={settings.roundUpSavingsAccount}
                onPress={() => {
                  const nextIndex = (ACCOUNTS.indexOf(settings.roundUpSavingsAccount) + 1) % ACCOUNTS.length;
                  setSetting("roundUpSavingsAccount", ACCOUNTS[nextIndex]);
                }}
              />
            ),
          },
        ]}
      </ToggleGroup>

      {settings.roundUpSavings ? (
        <Card style={{ padding: 16, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="calculator-outline" size={20} color={colors.accent} />
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>Estimated monthly</Text>
            <View style={{ flex: 1 }} />
            <Text style={{ color: colors.accent, fontSize: 16, fontWeight: "800" }}>
              {formatMoney(11.4, currency)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {QUICK_AMOUNTS.map((amount) => (
              <View
                key={amount}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  backgroundColor: colors.surfaceRaised,
                }}
              >
                <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
                  A {formatMoney(amount, currency)} spend adds {formatMoney(0.5, currency)} average
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <ToggleGroup title="Transfers">
        {[
          {
            key: "pin",
            node: (
              <ToggleRow
                title="Always ask for PIN"
                subtitle="Require your transaction PIN on every transfer, however small"
                icon="key-outline"
                value={settings.requirePinForTransfers}
                onChange={(next) => setSetting("requirePinForTransfers", next)}
              />
            ),
          },
          {
            key: "confirm",
            node: (
              <ToggleRow
                title="Show a confirmation step"
                subtitle="Review the amount and recipient before sending"
                icon="checkmark-done-outline"
                value={settings.transferConfirmation}
                onChange={(next) => setSetting("transferConfirmation", next)}
              />
            ),
          },
          {
            key: "bio",
            node: (
              <ToggleRow
                title="Approve with biometrics"
                subtitle="Use Face ID or a fingerprint instead of typing your PIN"
                icon="finger-print-outline"
                value={settings.biometricQuickTransfer}
                onChange={(next) => setSetting("biometricQuickTransfer", next)}
              />
            ),
          },
        ]}
      </ToggleGroup>

      <ToggleGroup title="Alerts">
        {[
          {
            key: "low",
            node: (
              <ToggleRow
                title="Low balance alerts"
                subtitle="Tell me before I go under my threshold"
                icon="notifications-outline"
                value={settings.lowBalanceAlerts}
                onChange={(next) => setSetting("lowBalanceAlerts", next)}
              />
            ),
          },
          {
            key: "marketing",
            node: (
              <ToggleRow
                title="Product announcements"
                subtitle="Occasional offers and feature news"
                icon="megaphone-outline"
                value={settings.marketingPush}
                onChange={(next) => setSetting("marketingPush", next)}
              />
            ),
          },
        ]}
      </ToggleGroup>

      {settings.lowBalanceAlerts ? (
        <Card style={{ paddingHorizontal: 14 }}>
          <PickerRow
            title="Alert me below"
            subtitle="Applied to your main account"
            icon="warning-outline"
            value={formatMoney(settings.lowBalanceThreshold, currency)}
            onPress={() => {
              const steps = [50, 100, 250, 500];
              const index = steps.indexOf(settings.lowBalanceThreshold);
              setSetting("lowBalanceThreshold", steps[(index + 1) % steps.length]);
            }}
          />
        </Card>
      ) : null}

      <ToggleGroup title="Notifications">
        {[
          {
            key: "quiet",
            node: (
              <ToggleRow
                title="Quiet hours"
                subtitle="Hold non-urgent notifications overnight"
                icon="moon-outline"
                value={settings.quietHours}
                onChange={(next) => setSetting("quietHours", next)}
              />
            ),
          },
          {
            key: "quietFrom",
            node: (
              <PickerRow
                title="Quiet from"
                icon="time-outline"
                value={settings.quietFrom}
                onPress={() => setSetting("quietFrom", settings.quietFrom === "22:00" ? "23:30" : "22:00")}
              />
            ),
          },
          {
            key: "quietTo",
            node: (
              <PickerRow
                title="Quiet until"
                icon="sunny-outline"
                value={settings.quietTo}
                onPress={() => setSetting("quietTo", settings.quietTo === "07:00" ? "08:00" : "07:00")}
              />
            ),
          },
        ]}
      </ToggleGroup>

      <ToggleGroup title="App behaviour">
        {[
          {
            key: "saver",
            node: (
              <ToggleRow
                title="Data saver"
                subtitle="Load images and charts only when you ask"
                icon="cellular-outline"
                value={settings.dataSaverMode}
                onChange={(next) => setSetting("dataSaverMode", next)}
              />
            ),
          },
          {
            key: "motion",
            node: (
              <ToggleRow
                title="Reduce motion"
                subtitle="Cut animation across the app"
                icon="accessibility-outline"
                value={settings.reduceMotion}
                onChange={(next) => setSetting("reduceMotion", next)}
              />
            ),
          },
          {
            key: "autolock",
            node: (
              <ToggleRow
                title="Lock on background"
                subtitle="Require a sign in when you reopen the app"
                icon="lock-closed-outline"
                value={settings.autoLockOnBackground}
                onChange={(next) => setSetting("autoLockOnBackground", next)}
              />
            ),
          },
        ]}
      </ToggleGroup>

      <Section title="Display" gap={12}>
        <ListCard style={{ paddingHorizontal: 12 }}>
          <Row
            title="Theme"
            subtitle={preference === "system" ? "Following your device" : `Always ${preference}`}
            icon="contrast-outline"
            chevron
            onPress={() => {
              const next = preference === "system" ? "light" : preference === "light" ? "dark" : "system";
              setPreference(next);
              toast.success(`Theme set to ${next}.`);
            }}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Display currency"
            subtitle={`Balances shown in ${currencyName(currency)}`}
            icon="cash-outline"
            chevron
            onPress={() => {
              const index = CURRENCY_CODES.indexOf(currency);
              const next = CURRENCY_CODES[(index + 1) % CURRENCY_CODES.length];
              void setCurrency(next);
              toast.success(`Currency set to ${next} (${currencyName(next)}).`);
            }}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Symbol check"
            subtitle={`${CURRENCIES[currency].symbol} used for every amount`}
            icon="pricetag-outline"
            onPress={() => toast.info(`${currencyName(currency)}: ${CURRENCIES[currency].symbol}`)}
          />
        </ListCard>
      </Section>

      <Section title="Data" gap={12}>
        <ListCard style={{ paddingHorizontal: 12 }}>
          <Row
            title="Download my data"
            subtitle="A machine-readable copy of everything we hold"
            icon="download-outline"
            chevron
            onPress={() => router.push("/statements")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Privacy policy"
            icon="document-text-outline"
            chevron
            onPress={() => router.push("/privacy")}
          />
          <Divider inset={rowTextInset(20)} />
          <Row
            title="Help centre"
            icon="help-circle-outline"
            chevron
            onPress={() => router.push("/helpsupport")}
          />
        </ListCard>
      </Section>

      <Section title="This build" gap={12}>
        <Card style={{ padding: 16, gap: 14 }}>
          <Banner
            tone="info"
            icon="flask-outline"
            message="Goals, budgets, bills, loans, tickets and these settings are held on this device only. No backend endpoints exist for them yet."
          />
          <Button label="Reset demo data" variant="dangerOutline" onPress={confirmReset} />
        </Card>
      </Section>

      <Button label="Sign out" variant="dangerOutline" icon="log-out-outline" onPress={confirmSignOut} />

      <Text style={{ color: colors.textSubtle, fontSize: 12, textAlign: "center" }}>
        INVETO 1.0.1 · {dark ? "Dark" : "Light"} theme
      </Text>
    </Screen>
  );
}
