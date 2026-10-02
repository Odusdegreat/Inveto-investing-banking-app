import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { notifyPushChange } from "@/src/store/push";
import { api, type PushRegistration } from "@/src/api/client";

const key = (userId: string) => `inveto.push-registration.${userId}`;
export async function getPushRegistration(userId: string): Promise<PushRegistration | null> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return null;
  const record = JSON.parse(raw) as PushRegistration;
  return typeof record.id === "string" ? record : null;
}
export function pushAvailability(): string | null {
  if (Platform.OS === "web") return "Push notifications are available in the mobile app. Your notification inbox still works here.";
  if (!Device.isDevice) return "Use a physical phone to register for push notifications.";
  if (Constants.executionEnvironment === "storeClient") return "Push notifications require the installed INVETO app.";
  return null;
}
export async function registerDevicePush(userId: string, requestPermission = true): Promise<PushRegistration> {
  const unavailable = pushAvailability();
  if (unavailable) throw new Error(unavailable);
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Account notifications", importance: Notifications.AndroidImportance.DEFAULT });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Notifications are not allowed. Enable them in your device settings, then try again.");
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error("Push notifications are not available in this build yet.");
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const result = await api.security.registerPush("expo", token);
  if (!result.id || typeof result.deliveryEnabled !== "boolean") throw new Error("The server did not return a notification registration. Try again.");
  await AsyncStorage.setItem(key(userId), JSON.stringify(result));
  notifyPushChange();
  return result;
}
export async function unregisterDevicePush(userId: string) {
  const registration = await getPushRegistration(userId);
  if (!registration) return;
  await api.security.removePush(registration.id);
  await AsyncStorage.removeItem(key(userId));
  notifyPushChange();
}
