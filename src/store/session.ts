import { acceptSession, hydrate, onSessionExpired, saveTokens } from "@/src/api/http";
import { toast } from "@/src/components/Toast";
import { create } from "zustand";

import { ApiError, api } from "@/src/api/client";
import type { User } from "@/src/types";



export type SessionStatus = "loading" | "signed-out" | "signed-in";

type SessionState = {
  status: SessionStatus;
  user: User | null;
  error: string | null;
  busy: boolean;
  challengeToken: string | null;
  verifyTwoFactor: (code: string) => Promise<boolean>;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
};

export const useSession = create<SessionState>((set, get) => ({
  status: "loading",
  user: null,
  error: null,
  busy: false,
  challengeToken: null,

  hydrate: async () => {
    try {
      const token = await hydrate();
      if (!token) {
        set({ status: "signed-out" });
        return;
      }
      const user = await api.user.get();
      set({ status: "signed-in", user });
    } catch {

      set({ status: "signed-out" });
    }
  },

  signIn: async (email, password) => {
    set({ busy: true, error: null });
    try {
      const response = await api.auth.signIn(email, password);
      if ("requiresTwoFactor" in response) {
        set({ challengeToken: response.challengeToken, busy: false });
        return false;
      }
      await acceptSession(response);
      const user = response.user ?? await api.user.get();
      set({ status: "signed-in", user, busy: false, challengeToken: null });
      return true;
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Something went wrong";
      set({ error: message, busy: false });
      toast.error(message);
      return false;
    }
  },

  verifyTwoFactor: async (code) => {
    const challengeToken = get().challengeToken;
    if (!challengeToken) return false;
    set({ busy: true, error: null });
    try {
      const response = await api.auth.verifyTwoFactor(challengeToken, code);
      await acceptSession(response);
      const user = response.user ?? await api.user.get();
      set({ status: "signed-in", user, busy: false, challengeToken: null });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verification failed";
      set({ busy: false, error: message });
      toast.error(message);
      return false;
    }
  },
  signOut: async () => {
    const userId = get().user?.id;
    if (userId) {
      try {
        const { unregisterDevicePush } = await import("@/src/lib/push");
        await unregisterDevicePush(userId);
      } catch { /* Local sign-out must remain available offline. */ }
    }
    await api.auth.logout().catch(() => undefined);
    await saveTokens(null);
    set({ status: "signed-out", user: null, error: null, challengeToken: null });
    toast.success("Signed out.");
  },

  refreshUser: async () => {
    if (get().status !== "signed-in") return;
    try {
      const user = await api.user.get();
      set({ user });
    } catch {
      // keep the cached user if a refresh fails
    }
  },

  clearError: () => set({ error: null }),
}));

export function useIsSignedIn() {
  return useSession((s) => s.status === "signed-in");
}

onSessionExpired(() => useSession.setState({ status: "signed-out", user: null, challengeToken: null }));
