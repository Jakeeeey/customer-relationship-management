// src/components/theme/ThemeProvider.tsx
"use client";

import * as React from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
    theme: Theme | undefined;
    setTheme: (theme: string) => void;
    resolvedTheme: "dark" | "light" | undefined;
    systemTheme: "dark" | "light" | undefined;
}

const ThemeContext = React.createContext<ThemeContextType>({
    theme: undefined,
    setTheme: () => {},
    resolvedTheme: undefined,
    systemTheme: undefined,
});

export const useTheme = () => React.useContext(ThemeContext);

export default function ThemeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [theme, setThemeState] = React.useState<Theme>(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("theme") as Theme) || "system";
        }
        return "system";
    });

    const [systemTheme, setSystemTheme] = React.useState<"dark" | "light" | undefined>(undefined);

    const resolvedTheme = React.useMemo(() => {
        if (theme !== "system") return theme;
        return systemTheme;
    }, [theme, systemTheme]);

    // Handle system preference changes
    React.useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => setSystemTheme(media.matches ? "dark" : "light");
        
        handleChange();
        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, []);

    // Apply theme to document
    React.useEffect(() => {
        if (!resolvedTheme) return;

        const root = document.documentElement;
        root.classList.toggle("dark", resolvedTheme === "dark");
        root.style.colorScheme = resolvedTheme;
        
        localStorage.setItem("theme", theme);
    }, [theme, resolvedTheme]);

    const setTheme = React.useCallback((newTheme: string) => {
        setThemeState(newTheme as Theme);
    }, []);

    const value = React.useMemo(() => ({
        theme,
        setTheme,
        resolvedTheme,
        systemTheme
    }), [theme, setTheme, resolvedTheme, systemTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}
