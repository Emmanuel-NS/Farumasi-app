import { create } from "zustand";
import { authService, type CurrentUser } from "@/lib/services/auth.service";

interface AuthState {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
  setUser: (user: CurrentUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const tokens = await authService.login(email, password);
    localStorage.setItem("farumasi_pharm_token", tokens.access_token);
    localStorage.setItem("farumasi_pharm_refresh", tokens.refresh_token);
    const user = await authService.getMe();
    localStorage.setItem("farumasi_pharm_user", JSON.stringify(user));
    set({ user, token: tokens.access_token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("farumasi_pharm_token");
    localStorage.removeItem("farumasi_pharm_refresh");
    localStorage.removeItem("farumasi_pharm_user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => {
    try { localStorage.setItem("farumasi_pharm_user", JSON.stringify(user)); } catch {}
    set({ user });
  },

  hydrate: async () => {
    const token = localStorage.getItem("farumasi_pharm_token");
    if (!token) { set({ isLoading: false }); return; }
    try {
      const user = await authService.getMe();
      localStorage.setItem("farumasi_pharm_user", JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("farumasi_pharm_token");
      localStorage.removeItem("farumasi_pharm_refresh");
      localStorage.removeItem("farumasi_pharm_user");
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
