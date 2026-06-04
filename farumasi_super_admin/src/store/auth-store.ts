import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TOKEN_KEY } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  setSession: (
    tokens: { access_token: string; refresh_token: string },
    user: AdminUser,
  ) => void;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setSession: ({ access_token, refresh_token }, user) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, access_token);
        }
        set({ token: access_token, refreshToken: refresh_token, user });
      },
      login: (token, user) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, token);
        }
        set({ token, user });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(TOKEN_KEY);
        }
        set({ token: null, refreshToken: null, user: null });
      },
    }),
    { name: "farumasi_admin_auth" },
  ),
);
