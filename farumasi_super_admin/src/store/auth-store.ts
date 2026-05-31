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
  user: AdminUser | null;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => {
        if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
        set({ token, user });
      },
      logout: () => {
        if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
        set({ token: null, user: null });
      },
    }),
    { name: "farumasi_admin_auth" },
  ),
);
