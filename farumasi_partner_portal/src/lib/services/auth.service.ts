import api from "@/lib/api";
import type { AuthUser } from "@/lib/store/auth";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegistrationPendingResponse {
  message: string;
  email: string;
  expires_minutes: number;
  requires_verification: boolean;
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
    const { data } = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
      portal: "partner",
    });
    return data;
  },

  async register(payload: RegisterPayload): Promise<RegistrationPendingResponse> {
    const { data } = await api.post<RegistrationPendingResponse>("/auth/register", payload);
    return data;
  },

  async verifyRegistration(
    email: string,
    code: string,
    role: RegisterPayload["role"] = "partner_company_admin",
  ): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/verify-registration", {
      email: email.trim(),
      code: code.trim(),
      role,
    });
    return data;
  },

  async resendRegistrationOtp(email: string): Promise<RegistrationPendingResponse> {
    const { data } = await api.post<RegistrationPendingResponse>("/auth/resend-registration-otp", {
      email: email.trim(),
      role: "partner_company_admin",
    });
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>("/users/me");
    return data;
  },

  async forgotPassword(email: string): Promise<{ status: string; message: string }> {
    const { data } = await api.post<{ status: string; message: string }>("/auth/forgot-password", {
      email: email.trim(),
    });
    return data;
  },

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ status: string; message: string }> {
    const { data } = await api.post<{ status: string; message: string }>("/auth/reset-password", {
      email: email.trim(),
      code: code.trim(),
      new_password: newPassword,
    });
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
