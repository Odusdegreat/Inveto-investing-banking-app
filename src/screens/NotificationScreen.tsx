import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "@/src/api/client";
import {
  Card,
  Divider,
  EmptyState,
  ErrorState,
  HeaderBar,
  Row,
  Screen,
  SectionHeader,
  Skeleton,
} from "@/src/components/ui";
import { useApi } from "@/src/hooks/useApi";
import { formatRelative } from "@/src/lib/format";
import { useTheme } from "@/src/theme/ThemeProvider";
import type { AppNotification, NotificationKind } from "@/src/types";

const KIND_ICON: Record<
  NotificationKind,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  security: "shield-checkmark-outline",
  transaction: "cash-outline",
  investment: "trending-up-outline",
  system: "information-circle-outline",
  promo: "sparkles-outline",
};

export default function NotificationScreen() {
  const router = useRouter();
  const { colors, radii } = useTheme();
  const { data, loading, error, reload, refreshing } = useApi(
    () => api.notifications.list(),
    [],
  );

  const unread = data?.filter((item) => !item.read).length ?? 0;

  const open = (item: AppNotification) => {
    void api.notifications.markRead(item.id);
    if (item.href) router.push(item.href as never);
  };

  return (
    <Screen onRefresh={reload} refreshing={refreshing}>
      <HeaderBar
        title="Notifications"
        right={
          unread > 0 ? (
            <Pressable
              onPress={() => void api.notifications.markAllRead()}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
              hitSlop={8}
            >
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>
                Mark all
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )
        }
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Card style={{ padding: 16, gap: 14 }}>
          <Skeleton height={40} />
          <Skeleton height={40} width="78%" />
        </Card>
      ) : data?.length ? (
        <>
          <SectionHeader title={unread > 0 ? `${unread} unread` : "All caught up"} />
          <Card style={{ paddingVertical: 4 }}>
            {data.map((item, index) => (
              <View key={item.id}>
                <Row
                  title={item.title}
                  subtitle={`${item.body} · ${formatRelative(item.createdAt)}`}
                  onPress={() => open(item)}
                  left={<Icon item={item} />}
                  right={
                    !item.read ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: colors.accent,
                          marginLeft: 8,
                        }}
                      />
                    ) : null
                  }
                />
                {index < data.length - 1 ? <Divider inset={60} /> : null}
              </View>
            ))}
          </Card>

          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            style={{
              alignItems: "center",
              marginTop: 20,
              paddingVertical: 9,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700" }}>
              Open full inbox
            </Text>
          </Pressable>
        </>
      ) : (
        <EmptyState
          icon="notifications-off-outline"
          title="Nothing here yet"
          message="Security alerts and money movement will show up here."
        />
      )}
    </Screen>
  );
}

function Icon({ item }: { item: AppNotification }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: item.read ? colors.surfaceRaised : colors.accentSoft,
      }}
    >
      <Ionicons
        name={KIND_ICON[item.kind]}
        size={17}
        color={item.read ? colors.textMuted : colors.accent}
      />
    </View>
  );
}
