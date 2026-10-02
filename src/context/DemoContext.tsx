import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface DemoContextType {
  isDemo: boolean;
  setIsDemo: (value: boolean) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

async function getInitialDemo(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem("inveto.demo");
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getInitialDemo().then((value) => {
      setIsDemo(value);
      setLoaded(true);
    });
  }, []);

  const setDemo = async (value: boolean) => {
    setIsDemo(value);
    try {
      await AsyncStorage.setItem("inveto.demo", String(value));
    } catch {
      // ignore
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <DemoContext.Provider value={{ isDemo, setIsDemo: setDemo }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within DemoProvider");
  }
  return context;
}