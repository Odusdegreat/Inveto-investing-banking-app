import "expo-dev-client";
import "react-native-reanimated";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "@/src/theme/ThemeProvider";
import { PushNotifications } from "@/src/components/PushNotifications";
import { ToastViewport } from "@/src/components/Toast";
import { useSession } from "@/src/store/session";
import { DemoProvider } from "@/src/context/DemoContext";
import { SignInModal } from "@/src/components/SignInModal";

export { ErrorBoundary } from "expo-router";

function Navigator() {
  const { colors, dark } = useTheme();
  const status = useSession((s) => s.status);
  const hydrate = useSession((s) => s.hydrate);
  const [showSignInModal, setShowSignInModal] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (status === "signed-out") {
      setShowSignInModal(true);
    } else {
      setShowSignInModal(false);
    }
  }, [status]);

  const handleSignInSuccess = () => {
    setShowSignInModal(false);
  };

  const handleSignInClose = () => {
    setShowSignInModal(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={dark ? "light" : "dark"} />
      {status === "loading" ? (
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Protected guard={status === "signed-in"}>
            <Stack.Screen name="(main)" />
            <Stack.Screen name="accounts" />
            <Stack.Screen name="transfer" />
            <Stack.Screen name="receive" />
            <Stack.Screen name="transactions" />
            <Stack.Screen name="transaction/[id]" />
            <Stack.Screen name="invest/[id]" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="pin" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
            <Stack.Screen name="securitysettings" />
            <Stack.Screen name="paymentmethods" />
            <Stack.Screen name="editprofile" />
            <Stack.Screen name="helpsupport" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="biometrics" />
            <Stack.Screen name="beneficiaries" />
            <Stack.Screen name="investment-orders" />
            <Stack.Screen name="card-link" />
            <Stack.Screen name="notification-settings" />
            <Stack.Screen name="open-account" />
            <Stack.Screen name="external-transfer" />
            <Stack.Screen name="recurring-transfers" />
            <Stack.Screen name="bills" />
            <Stack.Screen name="budgeting" />
            <Stack.Screen name="savings-goals" />
            <Stack.Screen name="portfolio-analytics" />
            <Stack.Screen name="statements" />
            <Stack.Screen name="cards" />
            <Stack.Screen name="verification" />
            <Stack.Screen name="loans" />
            <Stack.Screen name="referral" />
            <Stack.Screen name="tickets" />
            <Stack.Screen name="settings-advanced" />
            <Stack.Screen name="search" />
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="verify-email" />
        </Stack>
      )}
      <PushNotifications />
      <ToastViewport />
      <SignInModal
        visible={showSignInModal}
        onClose={handleSignInClose}
        onSuccess={handleSignInSuccess}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DemoProvider>
            <Navigator />
          </DemoProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
