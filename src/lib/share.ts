import { Platform } from "react-native";
import * as Sharing from "expo-sharing";

/** Opens the OS share sheet for a file URI, falling back to a plain alert. */
export async function shareFile(uri: string, mimeType: string, dialogTitle: string) {
  if (Platform.OS === "web") {
    window.open(uri, "_blank");
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle });
    return;
  }
  const { Alert } = await import("react-native");
  Alert.alert("Saved", `File written to ${uri}`);
}
