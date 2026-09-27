import "expo-dev-client";
import "react-native-reanimated";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider, useTheme } from "@/src/theme/ThemeProvider";
import { useSession } from "@/src/store/session";

export { ErrorBoundary } from "expo-router";

function Navigator() {
  const { colors, dark } = useTheme();
  const status = useSession((s) => s.status);
  const hydrate = useSession((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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
          {status === "signed-out" ? (
            <Stack.Screen name="(auth)" />
          ) : (
            <>
              <Stack.Screen name="(main)" />
              <Stack.Screen
                name="accounts"
                options={{ presentation: "modal", animation: "slide_from_bottom" }}
              />
              <Stack.Screen name="transfer" />
              <Stack.Screen name="transactions" />
              <Stack.Screen name="transaction/[id]" />
              <Stack.Screen
                name="invest/[id]"
                options={{ presentation: "modal", animation: "slide_from_bottom" }}
              />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="settings" />
              <Stack.Screen
                name="pin"
                options={{ presentation: "modal", animation: "slide_from_bottom" }}
              />
            </>
          )}
        </Stack>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Navigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
