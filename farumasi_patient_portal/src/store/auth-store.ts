import { create } from "zustand";
import { authService } from "@/lib/services/auth.service";
import { isMockMode } from "@/lib/env";
import type { AuthUser } from "@/types";

interface AuthStore {
  isGuest: boolean;
  /** True while hydrateAuth is resolving — prevents GuestGate from flashing lock screen */
  isHydrating: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  /** Sign in with email + password; fetches user profile automatically */
  login: (email: string, password: string) => Promise<void>;
  /** Register new patient account */
  register: (params: { full_name: string; email: string; phone?: string; password: string }) => Promise<void>;
  /** Clear session */
  logout: () => void;
  /** Rehydrate tokens from localStorage on client mount */
  hydrateAuth: () => Promise<void>;
  /** Manually set user (after profile update) */
  setUser: (user: AuthUser) => void;
}

function saveTokens(access: string, refresh: string) {
  localStorage.setItem("farumasi_access_token", access);
  localStorage.setItem("farumasi_refresh_token", refresh);
  localStorage.setItem("farumasi_auth", "true");
}

function clearTokens() {
  localStorage.removeItem("farumasi_access_token");
  localStorage.removeItem("farumasi_refresh_token");
  localStorage.removeItem("farumasi_auth");
}

export const useAuthStore = create<AuthStore>()((set) => ({
  isGuest: true,
  isHydrating: true,
  user: null,
  accessToken: null,

  login: async (email, password) => {
    if (isMockMode()) {
      const mockUser: AuthUser = { id: "mock-1", name: "Demo Patient", email, phone: "+250788000000", role: "patient" };
      saveTokens("mock-token", "mock-refresh");
      set({ isGuest: false, user: mockUser, accessToken: "mock-token" });
      return;
    }
    const tokens = await authService.login(email, password);
    saveTokens(tokens.access_token, tokens.refresh_token);
    const user = await authService.getMe();
    set({ isGuest: false, user, accessToken: tokens.access_token });
  },

  register: async (params) => {
    const tokens = await authService.register(params);
    saveTokens(tokens.access_token, tokens.refresh_token);
    const user = await authService.getMe();
    set({ isGuest: false, user, accessToken: tokens.access_token });
  },

  logout: () => {
    if (typeof window !== "undefined") clearTokens();
    set({ isGuest: true, user: null, accessToken: null });
  },

  hydrateAuth: async () => {
    if (typeof window === "undefined") return;
    if (isMockMode()) {
      const token = localStorage.getItem("farumasi_access_token");
      if (!token) { set({ isGuest: true, isHydrating: false }); return; }
      set({ isGuest: false, isHydrating: false, accessToken: token, user: { id: "mock-1", name: "Demo Patient", email: "patient@farumasi.com", phone: "+250788000000", role: "patient" } });
      return;
    }
    const token = localStorage.getItem("farumasi_access_token");
    if (!token) { set({ isGuest: true, isHydrating: false }); return; }
    try {
      const user = await authService.getMe();
      set({ isGuest: false, isHydrating: false, user, accessToken: token });
    } catch {
      clearTokens();
      set({ isGuest: true, isHydrating: false, user: null, accessToken: null });
    }
  },

  setUser: (user) => set({ user }),
}));
