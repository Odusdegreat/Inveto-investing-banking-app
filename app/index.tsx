import { Redirect } from "expo-router";

import { useSession } from "@/src/store/session";

export default function Index() {
  const status = useSession((state) => state.status);
  return <Redirect href={status === "signed-in" ? "/home" : "/(main)/home"} />;
}
