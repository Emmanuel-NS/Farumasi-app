"use client";

import { useEffect } from "react";
import { hydrateTheme, useThemeStore } from "@/store/theme-store";

const CHECK_MS = 60_000;

/** Keeps `dark` on `<html>` in sync with patient theme preference and evening schedule. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const sync = useThemeStore((s) => s.sync);

  useEffect(() => {
    hydrateTheme();
  }, []);

  useEffect(() => {
    sync();
  }, [mode, sync]);

  useEffect(() => {
    const tick = () => sync();
    const id = window.setInterval(tick, CHECK_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [sync]);

  return children;
}
