import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import { useAuth } from "@/hooks/use-auth";

type Theme = "light" | "dark";

type ThemeProviderContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
};

const ThemeProviderContext = createContext<ThemeProviderContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>("light");

  const { data: userTheme, isLoading } = useQuery({
    queryKey: ["/api/theme"],
    enabled: !!user,
  });

  const saveThemeMutation = useMutation({
    mutationFn: async (themeName: Theme) => {
      const res = await apiRequest("POST", "/api/theme", { themeName });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/theme"] });
    },
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    if (user) {
      saveThemeMutation.mutate(newTheme);
    } else {
      localStorage.setItem("theme", newTheme);
    }
  };

  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove("dark", "grey");
    
    switch (theme) {
      case "dark":
        root.classList.add("dark");
        break;
      case "grey":
        root.classList.add("grey");
        break;
      default:
        // light theme is the default
        break;
    }
  };

  useEffect(() => {
    if (userTheme?.themeName) {
      setThemeState(userTheme.themeName);
      applyTheme(userTheme.themeName);
    } else if (!user) {
      const savedTheme = localStorage.getItem("theme") as Theme;
      if (savedTheme) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      }
    }
  }, [userTheme, user]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
