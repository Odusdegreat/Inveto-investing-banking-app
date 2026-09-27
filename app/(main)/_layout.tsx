import { Tabs } from "expo-router";

import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/src/theme/ThemeProvider";

export default function MainTabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      initialRouteName="home"
      backBehavior="initialRoute"
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
        animation: "none",
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="investing" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="notification" />
      <Tabs.Screen name="user" />
    </Tabs>
  );
}
