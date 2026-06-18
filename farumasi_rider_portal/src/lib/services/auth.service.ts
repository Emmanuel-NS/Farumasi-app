import api from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post<{ access_token: string; refresh_token?: string }>(
      "/auth/login",
      { email: email.trim().toLowerCase(), password, role: "rider" },
    );
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>("/users/me");
    return data;
  },
};
