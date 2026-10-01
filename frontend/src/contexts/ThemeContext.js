import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import api from "../lib/api";

const THEMES = {
  "earthy-minimal": {
    name: "Earthy Minimal", type: "light",
    vars: { "--background": "40 33% 98%", "--foreground": "0 0% 10%", "--primary": "10 45% 60%", "--primary-foreground": "0 0% 100%", "--secondary": "30 18% 88%", "--secondary-foreground": "0 0% 18%", "--accent": "130 15% 61%", "--border": "30 18% 88%", "--card": "0 0% 100%", "--card-foreground": "0 0% 10%", "--ring": "10 45% 60%", "--muted": "30 18% 93%", "--muted-foreground": "0 0% 40%", "--popover": "0 0% 100%", "--popover-foreground": "0 0% 10%", "--input": "30 18% 88%", "--destructive": "0 84% 60%", "--destructive-foreground": "0 0% 98%" },
  },
  "midnight-luxe": {
    name: "Midnight Luxe", type: "dark",
    vars: { "--background": "210 30% 5%", "--foreground": "0 0% 96%", "--primary": "45 70% 52%", "--primary-foreground": "210 30% 5%", "--secondary": "210 20% 13%", "--secondary-foreground": "0 0% 88%", "--accent": "210 20% 13%", "--border": "210 15% 22%", "--card": "210 25% 8%", "--card-foreground": "0 0% 96%", "--ring": "45 70% 52%", "--muted": "210 20% 13%", "--muted-foreground": "0 0% 60%", "--popover": "210 25% 8%", "--popover-foreground": "0 0% 96%", "--input": "210 15% 22%", "--destructive": "0 62% 30%", "--destructive-foreground": "0 0% 98%" },
  },
  "soft-blush": {
    name: "Soft Blush", type: "light",
    vars: { "--background": "0 100% 98%", "--foreground": "215 19% 25%", "--primary": "15 62% 68%", "--primary-foreground": "0 0% 100%", "--secondary": "15 100% 90%", "--secondary-foreground": "215 13% 34%", "--accent": "15 100% 90%", "--border": "0 23% 92%", "--card": "0 0% 100%", "--card-foreground": "215 19% 25%", "--ring": "15 62% 68%", "--muted": "0 23% 95%", "--muted-foreground": "215 13% 40%", "--popover": "0 0% 100%", "--popover-foreground": "215 19% 25%", "--input": "0 23% 92%", "--destructive": "0 84% 60%", "--destructive-foreground": "0 0% 98%" },
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState("earthy-minimal");
  const [settings, setSettings] = useState({ business_name: "LuxeSalon", business_email: "", business_webpage: "", theme: "earthy-minimal" });

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
      if (data.theme && THEMES[data.theme]) {
        setThemeName(data.theme);
      }
    } catch (err) {
      console.warn("Settings fetch failed, using defaults");
    }
  }, []);

  const applyTheme = useCallback((name) => {
    const theme = THEMES[name];
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    if (theme.type === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    applyTheme(themeName);
  }, [themeName, applyTheme]);

  const updateTheme = useCallback(async (name) => {
    setThemeName(name);
    try {
      await api.put("/settings", { ...settings, theme: name });
      setSettings((prev) => ({ ...prev, theme: name }));
    } catch (err) {
      console.warn("Theme update failed:", err?.message);
    }
  }, [settings]);

  const updateSettings = useCallback(async (newSettings) => {
    const { data } = await api.put("/settings", newSettings);
    setSettings(data);
    return data;
  }, []);

  const value = useMemo(() => ({
    themeName, themes: THEMES, updateTheme, settings, setSettings, updateSettings, fetchSettings
  }), [themeName, updateTheme, settings, updateSettings, fetchSettings]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
