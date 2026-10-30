"use client";
import * as React from "react";

export type Theme = "light" | "dark";
export const THEME_KEY = "lc_theme";
const META_COLOR: Record<Theme, string> = { light: "#2563EB", dark: "#0B1220" };

/** Applies the theme to <html> (class + colour-scheme + browser UI colour) and optionally remembers it. */
export function applyTheme(theme: Theme, persist = true) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META_COLOR[theme]);
  if (persist) {
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }
}

const current = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

export function useTheme() {
  const [theme, setThemeState] = React.useState<Theme>("light");

  React.useEffect(() => {
    setThemeState(current());
    const observer = new MutationObserver(() => setThemeState(current()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    // Follow the device setting until the visitor picks a theme themselves.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = (e: MediaQueryListEvent) => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(THEME_KEY); } catch {}
      if (!saved) applyTheme(e.matches ? "dark" : "light", false);
    };
    mq.addEventListener?.("change", onSystem);
    return () => { observer.disconnect(); mq.removeEventListener?.("change", onSystem); };
  }, []);

  const toggle = React.useCallback(() => applyTheme(current() === "dark" ? "light" : "dark"), []);
  return { theme, toggle, setTheme: applyTheme };
}

/** Runs before first paint (inline in <head>) so there is no white flash for dark-mode visitors. */
export const themeInitScript = `(function(){try{var s=localStorage.getItem('${THEME_KEY}');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;if(d){r.classList.add('dark');r.style.colorScheme='dark'}}catch(e){}})();`;
