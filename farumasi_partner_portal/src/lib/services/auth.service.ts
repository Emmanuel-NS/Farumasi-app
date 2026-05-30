import api from "@/lib/api";
import type { AuthUser } from "@/lib/store/auth";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: "pharmacy_admin" | "partner_company_admin";
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
    return data;
  },

  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/register", payload);
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>("/users/me");
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
