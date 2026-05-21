import { create } from "zustand";

interface AuthStore {
  isGuest: boolean;
  login: () => void;
  logout: () => void;
  /** Rehydrate from localStorage on client mount */
  hydrateAuth: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  isGuest: true,

  login: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("farumasi_auth", "true");
    }
    set({ isGuest: false });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("farumasi_auth");
    }
    set({ isGuest: true });
  },

  hydrateAuth: () => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("farumasi_auth");
      set({ isGuest: stored !== "true" });
    }
  },
}));
