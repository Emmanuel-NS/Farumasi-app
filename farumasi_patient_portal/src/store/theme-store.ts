import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyDarkClass,
  resolveDarkEnabled,
  type ThemeMode,
} from "@/lib/theme-schedule";

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Re-evaluate auto schedule and apply class. */
  sync: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: "auto",
      setMode: (mode) => {
        set({ mode });
        applyDarkClass(resolveDarkEnabled(mode));
      },
      sync: () => {
        applyDarkClass(resolveDarkEnabled(get().mode));
      },
    }),
    {
      name: "farumasi-theme",
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) applyDarkClass(resolveDarkEnabled(state.mode));
      },
    },
  ),
);

export function hydrateTheme() {
  const { mode, sync } = useThemeStore.getState();
  applyDarkClass(resolveDarkEnabled(mode));
  sync();
}
