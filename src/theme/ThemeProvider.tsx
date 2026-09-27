import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

import {
  darkColors,
  lightColors,
  radii,
  spacing,
  type Theme,
  type ThemeColors,
} from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = Theme & {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "inveto.theme-preference";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (active && (stored === "light" || stored === "dark")) {
          setPreferenceState(stored);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((value: ThemePreference) => {
    setPreferenceState(value);
    AsyncStorage.setItem(STORAGE_KEY, value).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const dark = preference === "dark" || (preference === "system" && system !== "light");
    return {
      dark,
      colors: dark ? darkColors : lightColors,
      radii,
      spacing,
      preference,
      setPreference,
    };
  }, [preference, setPreference, system]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
}

export function useColors(): ThemeColors {
  return useTheme().colors;
}
