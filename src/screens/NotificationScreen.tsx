import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { errorMessage, toast } from "@/src/components/Toast";
import { api } from "@/src/api/client";
import {
  Card,
  Divider,
  EmptyState,
  ErrorState,
  HeaderAction,
  HeaderBar,
  IconBadge,
  ListCard,
  Row,
  Screen,
  Section,
  Skeleton,
  Stack,
  rowTextInset,
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
    void api.notifications
      .markRead(item.id)
      .catch((error) => toast.error(errorMessage(error)));
    if (item.href) router.push(item.href as never);
  };

  const markAll = () => {
    void api.notifications
      .markAllRead()
      .then(() => toast.success("All notifications marked as read."))
      .catch((error) => toast.error(errorMessage(error)));
  };

  return (
    <Screen gap={22} onRefresh={reload} refreshing={refreshing}>
      <HeaderBar
        title="Notifications"
        right={
          unread > 0 ? (
            <HeaderAction label="Mark all" onPress={markAll} />
          ) : (
            <View style={{ width: 40 }} />
          )
        }
      />

      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {loading && !data ? (
        <Card style={{ padding: 20, gap: 18 }}>
          <Skeleton height={44} />
          <Skeleton height={44} width="78%" />
        </Card>
      ) : data?.length ? (
        <>
          <Section
            title={unread > 0 ? `${unread} unread` : "All caught up"}
            gap={12}
          >
            <ListCard>
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
                          style={[
                            styles.unreadDot,
                            { backgroundColor: colors.accent },
                          ]}
                        />
                      ) : null
                    }
                  />
                  {index < data.length - 1 ? (
              <Divider inset={rowTextInset(42)} />
            ) : null}
                </View>
              ))}
            </ListCard>
          </Section>

          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel="Open full inbox"
            style={({ pressed }) => [
              styles.inboxButton,
              {
                borderRadius: radii.pill,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceRaised : "transparent",
              },
            ]}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "700" }}>
              Open full inbox
            </Text>
          </Pressable>
        </>
      ) : (
        <Stack>
          <EmptyState
            icon="notifications-off-outline"
            title="Nothing here yet"
            message="Security alerts and money movement will show up here."
          />
        </Stack>
      )}
    </Screen>
  );
}

function Icon({ item }: { item: AppNotification }) {
  let icon = KIND_ICON[item.kind];
  let tone: "accent" | "success" | "warning" | "neutral" | "danger" = item.read ? "neutral" : "accent";

  if (item.kind === "transaction") {
    const match = item.body.match(/\$([\d,]+\.?\d*)/);
    if (match) {
      const amount = Number(match[1].replace(",", ""));
      if (amount > 0) {
        icon = "trending-up-outline";
        tone = "success";
      } else {
        icon = "trending-down-outline";
        tone = "danger";
      }
    }
  }

  return <IconBadge icon={icon} tone={tone} />;
}

const styles = StyleSheet.create({
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginLeft: 8,
  },
  inboxButton: {
    alignItems: "center",
    paddingVertical: 13,
    borderWidth: 1,
  },
});
