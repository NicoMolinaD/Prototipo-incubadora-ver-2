import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark" | "blue" | "green" | "purple";

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
}

const themes: Record<Theme, ThemeColors> = {
  light: {
    primary: "#3b82f6",
    secondary: "#64748b",
    background: "#ffffff",
    card: "#f8fafc",
    text: "#1e293b",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    accent: "#10b981",
  },
  dark: {
    primary: "#60a5fa",
    secondary: "#94a3b8",
    background: "#0f172a",
    card: "#1e293b",
    text: "#f1f5f9",
    textSecondary: "#cbd5e1",
    border: "#334155",
    accent: "#34d399",
  },
  blue: {
    primary: "#2563eb",
    secondary: "#3b82f6",
    background: "#eff6ff",
    card: "#dbeafe",
    text: "#1e3a8a",
    textSecondary: "#1e40af",
    border: "#93c5fd",
    accent: "#60a5fa",
  },
  green: {
    primary: "#059669",
    secondary: "#10b981",
    background: "#f0fdf4",
    card: "#dcfce7",
    text: "#065f46",
    textSecondary: "#047857",
    border: "#86efac",
    accent: "#34d399",
  },
  purple: {
    primary: "#7c3aed",
    secondary: "#8b5cf6",
    background: "#faf5ff",
    card: "#f3e8ff",
    text: "#581c87",
    textSecondary: "#6b21a8",
    border: "#c4b5fd",
    accent: "#a78bfa",
  },
};

interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme;
    return saved && themes[saved] ? saved : "light";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    const colors = themes[theme];
    
    // Aplicar variables CSS personalizadas
    document.documentElement.style.setProperty("--color-primary", colors.primary);
    document.documentElement.style.setProperty("--color-secondary", colors.secondary);
    document.documentElement.style.setProperty("--color-background", colors.background);
    document.documentElement.style.setProperty("--color-card", colors.card);
    document.documentElement.style.setProperty("--color-text", colors.text);
    document.documentElement.style.setProperty("--color-text-secondary", colors.textSecondary);
    document.documentElement.style.setProperty("--color-border", colors.border);
    document.documentElement.style.setProperty("--color-accent", colors.accent);
    
    // Agregar atributo data-theme para estilos CSS
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: themes[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

