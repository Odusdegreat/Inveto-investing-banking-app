import { useEffect } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { toast } from "@/src/components/Toast";
import { usePushChanges } from "@/src/store/push";
import { useSession } from "@/src/store/session";
import { useNotificationStore } from "@/src/store/notifications";

// Push payloads never supply arbitrary app routes or external URLs.
export function PushNotifications() {
  const version = usePushChanges((state) => state.version);
  const userId = useSession((state) => state.user?.id);
  const router = useRouter();
  const { incrementUnread } = useNotificationStore();
  useEffect(() => {
    if (!userId || Platform.OS === "web") return;
    let active = true;
    const cleanup: (() => void)[] = [];
    void (async () => {
      const { pushAvailability, getPushRegistration, registerDevicePush } = await import("@/src/lib/push");
      if (pushAvailability() || !active || !(await getPushRegistration(userId))) return;
      const Notifications = await import("expo-notifications");
      if (!active) return;
      const openInbox = () => {
        if (active && useSession.getState().user?.id === userId) router.push("/notifications");
      };
      const received = Notifications.addNotificationReceivedListener(() => {
        if (active && useSession.getState().user?.id === userId) {
          toast.info("You have a new account notification.");
          incrementUnread();
        }
      });
      const response = Notifications.addNotificationResponseReceivedListener(openInbox);
      const token = Notifications.addPushTokenListener(() => {
        if (active && useSession.getState().user?.id === userId) void registerDevicePush(userId, false).catch(() => undefined);
      });
      cleanup.push(() => received.remove(), () => response.remove(), () => token.remove());
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last && active) {
        openInbox();
        await Notifications.clearLastNotificationResponseAsync();
      }
    })().catch(() => undefined);
    return () => { active = false; cleanup.forEach((remove) => remove()); };
  }, [userId, router, version, incrementUnread]);
  return null;
}
