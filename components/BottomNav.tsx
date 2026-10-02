import { Feather, Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { api } from "@/src/api/client";
import { useNotificationStore } from "@/src/store/notifications";
import { useTheme } from "@/src/theme/ThemeProvider";

type Tab = {
  route: string;
  ionicon: React.ComponentProps<typeof Ionicons>["name"];
  feather: React.ComponentProps<typeof Feather>["name"];
  label: string;
};

const TABS: Tab[] = [
  { route: "home", ionicon: "home-outline", feather: "home", label: "Home" },
  {
    route: "investing",
    ionicon: "trending-up-outline",
    feather: "trending-up",
    label: "Invest",
  },
  {
    route: "dashboard",
    ionicon: "grid-outline",
    feather: "grid",
    label: "Assets",
  },
  {
    route: "notification",
    ionicon: "notifications-outline",
    feather: "bell",
    label: "Alerts",
  },
  { route: "user", ionicon: "person-outline", feather: "user", label: "Profile" },
];

export default function BottomNav({
  state,
  navigation,
  insets,
}: BottomTabBarProps) {
  const { colors, radii } = useTheme();
  const activeRoute = state?.routes[state.index]?.name ?? state?.routes[0]?.name;
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  useEffect(() => {
    let cancelled = false;
    api.notifications.unreadCount()
      .then((count) => { if (!cancelled) useNotificationStore.getState().setUnreadCount(count); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const handlePress = (name: string) => {
    const route = state.routes.find((item) => item.name === name);
    if (!route) return;

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (activeRoute !== name && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.background,
        paddingBottom: Math.max(insets.bottom, 16),
        paddingTop: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.xl,
          marginHorizontal: 16,
          paddingVertical: 10,
        }}
      >
{TABS.map((tab) => (
            <TabItem
              key={tab.route}
              tab={tab}
              active={activeRoute === tab.route}
              unreadCount={tab.route === "notification" ? unreadCount : 0}
              onPress={() => handlePress(tab.route)}
            />
          ))}
      </View>
    </View>
  );
}

function TabItem({
  tab,
  active,
  unreadCount = 0,
  onPress,
}: {
  tab: Tab;
  active: boolean;
  unreadCount?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const tint = active ? colors.accent : colors.textSubtle;
  const showBadge = unreadCount > 0;

  const pulseStyle = useAnimatedStyle(() => {
    if (!active) return { transform: [{ scale: 1 }], opacity: 0 };
    return {
      transform: [
        { scale: withRepeat(withTiming(1.9, { duration: 1400 }), -1, false) },
      ],
      opacity: withRepeat(withTiming(0, { duration: 1400 }), -1, false),
    };
  }, [active]);

  const iconStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: withTiming(active ? 1.15 : 1, { duration: 180 }) }],
    }),
    [active],
  );

  const labelStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(active ? 1 : 0.7, { duration: 180 }),
      transform: [
        { scale: withTiming(active ? 1.03 : 1, { duration: 180 }) },
      ],
    }),
    [active],
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      hitSlop={8}
      style={{ alignItems: "center", justifyContent: "center", flex: 1, gap: 3 }}
    >
      <View style={{ alignItems: "center", justifyContent: "center", position: "relative" }}>
        <Animated.View
          style={[
            pulseStyle,
            {
              pointerEvents: "none",
              position: "absolute",
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.accent,
            },
          ]}
        />
        <Animated.View style={iconStyle}>
          <Ionicons name={tab.ionicon} size={21} color={tint} />
        </Animated.View>
        {showBadge && (
          <View
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: colors.danger,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: "white", fontSize: 10, fontWeight: "800" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
      </View>

      <Animated.Text
        style={[
          labelStyle,
          { color: tint, fontSize: 10.5, fontWeight: active ? "800" : "600" },
        ]}
      >
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}
