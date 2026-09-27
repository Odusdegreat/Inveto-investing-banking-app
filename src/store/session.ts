import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { ApiError, api, hydrate } from "@/src/api/client";
import type { User } from "@/src/types";

const TOKEN_KEY = "inveto.session.token";

export type SessionStatus = "loading" | "signed-out" | "signed-in";

type SessionState = {
  status: SessionStatus;
  user: User | null;
  error: string | null;
  busy: boolean;
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

  hydrate: async () => {
    try {
      await hydrate();
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        set({ status: "signed-out" });
        return;
      }
      const user = await api.user.get();
      set({ status: "signed-in", user });
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
      set({ status: "signed-out" });
    }
  },

  signIn: async (email, password) => {
    set({ busy: true, error: null });
    try {
      const { user, token } = await api.auth.signIn(email, password);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      set({ status: "signed-in", user, busy: false });
      return true;
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Something went wrong";
      set({ error: message, busy: false });
      return false;
    }
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    set({ status: "signed-out", user: null, error: null });
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
