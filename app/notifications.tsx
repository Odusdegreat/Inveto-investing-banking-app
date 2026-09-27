import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "@/src/api/client";
import {
  Card,
  EmptyState,
  ErrorState,
  HeaderBar,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatDate, formatTime } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { AppNotification, NotificationKind } from "@/src/types";

const KIND_ICON: Record<NotificationKind, React.ComponentProps<typeof Ionicons>["name"]> = {
  security: "shield-checkmark-outline",
  transaction: "cash-outline",
  investment: "trending-up-outline",
  system: "information-circle-outline",
  promo: "sparkles-outline",
};

export default function Notifications() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data, loading, error, reload } = useApi(
    () => api.notifications.list(),
    [],
  );

  const unread = data?.filter((item) => !item.read).length ?? 0;

  return (
    <Screen
      onRefresh={reload}
      refreshing={loading}
      contentStyle={{ paddingHorizontal: 20 }}
    >
      <HeaderBar
        title="Notifications"
        onBack={() => router.back()}
        right={
          unread > 0 ? (
            <Pressable
              onPress={() => void api.notifications.markAllRead()}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
              hitSlop={8}
            >
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>
                Mark all read
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )
        }
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Card style={{ padding: 18, gap: 16 }}>
          <Skeleton height={40} />
          <Skeleton height={40} width="80%" />
        </Card>
      ) : data?.length ? (
        <>
          <SectionHeader title={`${data.length} updates`} />
          {data.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </>
      ) : (
        <EmptyState
          icon="notifications-outline"
          title="Nothing new"
          message="Security alerts and money movement will appear here."
        />
      )}
    </Screen>
  );
}

function Item({ item }: { item: AppNotification }) {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const tint =
    item.kind === "system"
      ? colors.textMuted
      : item.kind === "transaction"
        ? colors.accent
        : colors.accent;

  const open = () => {
    void api.notifications.markRead(item.id);
    if (item.href) router.push(item.href as never);
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}`}
      accessibilityState={{ selected: !item.read }}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          gap: 12,
          padding: 14,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: item.read ? colors.border : colors.accent,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
          marginBottom: 10,
        },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceRaised,
        }}
      >
        <Ionicons name={KIND_ICON[item.kind]} size={18} color={tint} />
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 14,
              fontWeight: item.read ? "600" : "800",
              flex: 1,
            }}
          >
            {item.title}
          </Text>
          {!item.read ? (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.accent,
              }}
            />
          ) : null}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
          {item.body}
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: 11 }}>
          {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}
