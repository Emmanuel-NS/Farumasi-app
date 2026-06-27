import { create } from "zustand";
import { persist } from "zustand/middleware";
import { tokenKeys } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  profile_image_url?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (tokens: { access_token: string; refresh_token: string }, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

const AUTH_COOKIE = "farumasi_partner_auth";

function setAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearAuthCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      setSession: ({ access_token, refresh_token }, user) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(tokenKeys.TOKEN_KEY, access_token);
          localStorage.setItem(tokenKeys.REFRESH_KEY, refresh_token);
          localStorage.setItem(tokenKeys.USER_KEY, JSON.stringify(user));
          setAuthCookie();
        }
        set({ token: access_token, refreshToken: refresh_token, user });
      },
      setUser: (user) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(tokenKeys.USER_KEY, JSON.stringify(user));
        }
        set({ user });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(tokenKeys.TOKEN_KEY);
          localStorage.removeItem(tokenKeys.REFRESH_KEY);
          localStorage.removeItem(tokenKeys.USER_KEY);
          clearAuthCookie();
        }
        set({ token: null, refreshToken: null, user: null });
      },
    }),
    {
      name: "farumasi-partner-auth",
    },
  ),
);
