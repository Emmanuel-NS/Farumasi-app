/** Night window: 6:30 PM → 5:30 AM (local time). */
export const NIGHT_START_MINUTES = 18 * 60 + 30; // 18:30
export const NIGHT_END_MINUTES = 5 * 60 + 30; // 05:30

export type ThemeMode = "auto" | "light" | "dark";

export function minutesOfDay(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** True between 6:30 PM and 5:30 AM. */
export function isNightSchedule(date: Date = new Date()): boolean {
  const m = minutesOfDay(date);
  return m >= NIGHT_START_MINUTES || m < NIGHT_END_MINUTES;
}

export function resolveDarkEnabled(mode: ThemeMode, date: Date = new Date()): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return isNightSchedule(date);
}

export const THEME_STORAGE_KEY = "farumasi-theme";

export function readPersistedThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return "auto";
    const parsed = JSON.parse(raw) as { state?: { mode?: ThemeMode }; mode?: ThemeMode };
    const mode = parsed.state?.mode ?? parsed.mode;
    if (mode === "light" || mode === "dark" || mode === "auto") return mode;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function applyDarkClass(enabled: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", enabled);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", enabled ? "#0f172a" : "#1E9E68");
}
