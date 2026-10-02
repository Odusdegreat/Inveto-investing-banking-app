import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "@/src/api/client";
import {
  Card,
  EmptyState,
  ErrorState,
  HeaderAction,
  HeaderBar,
  IconBadge,
  Screen,
  Section,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatDate, formatTime } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import { useNotificationStore } from "@/src/store/notifications";
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
  const { data, loading, error, reload } = useApi(
    () => api.notifications.list(),
    [],
  );
  const { resetUnread } = useNotificationStore();

  const unread = data?.filter((item) => !item.read).length ?? 0;

  useEffect(() => {
    resetUnread();
  }, [resetUnread]);

  return (
    <Screen
      gap={22}
      onRefresh={reload}
      refreshing={loading}
      contentStyle={{ paddingHorizontal: 20 }}
    >
      <HeaderBar
        title="Notifications"
        onBack={() => router.back()}
        right={
          unread > 0 ? (
            <HeaderAction
              label="Mark all"
              onPress={() => {
                void api.notifications.markAllRead();
                resetUnread();
              }}
            />
          ) : (
            <View style={{ width: 40 }} />
          )
        }
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Card style={{ padding: 20, gap: 16 }}>
          <Skeleton height={40} />
          <Skeleton height={40} width="80%" />
        </Card>
      ) : data?.length ? (
        <Section title={`${data.length} updates`} gap={12}>
          {data.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </Section>
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
  const { decrementUnread } = useNotificationStore();

  const open = () => {
    if (!item.read) {
      decrementUnread();
    }
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
        styles.item,
        {
          borderRadius: radii.lg,
          borderColor: item.read ? colors.border : colors.accent,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
        },
      ]}
    >
      <IconBadge
        icon={KIND_ICON[item.kind]}
        size={40}
        tone={item.kind === "system" ? "neutral" : "accent"}
      />

      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              fontWeight: item.read ? "600" : "800",
              flex: 1,
            }}
          >
            {item.title}
          </Text>
          {!item.read ? (
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: colors.accent,
              }}
            />
          ) : null}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 14, lineHeight: 21 }}>
          {item.body}
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
          {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = {
  item: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 14,
    padding: 18,
    borderWidth: 1,
  },
};
