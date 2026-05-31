import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "brim-theme";

function applyTheme() {
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.setAttribute("data-theme", "light");
}

export function useTheme() {
  useEffect(() => {
    applyTheme();
    localStorage.setItem(STORAGE_KEY, "light");
  }, []);

  const toggle = () => {}; // Disabled
  return { theme: "light" as Theme, toggle, isDark: false };
}
