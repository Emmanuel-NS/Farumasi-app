import api from "@/lib/api";
import type { AuthUser } from "@/types";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface BackendUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  profile_image_url: string | null;
  created_at: string;
  two_factor_enabled?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  preferred_language?: string;
}

export function adaptUser(u: BackendUser): AuthUser {
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone ?? "",
    role: u.role as AuthUser["role"],
    avatarUrl: u.profile_image_url ?? undefined,
    twoFactorEnabled: u.two_factor_enabled ?? false,
    emailVerified: u.email_verified ?? false,
    phoneVerified: u.phone_verified ?? false,
  };
}

export interface RegistrationPendingResponse {
  message: string;
  email: string;
  expires_minutes: number;
  requires_verification: boolean;
}

export const authService = {
  async login(identifier: string, password: string): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/auth/login", {
      identifier: identifier.trim(),
      password,
      role: "patient",
    });
    return data;
  },

  async register(params: {
    full_name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<RegistrationPendingResponse> {
    const { data } = await api.post<RegistrationPendingResponse>("/auth/register", {
      ...params,
      role: "patient",
    });
    return data;
  },

  async verifyRegistration(email: string, code: string): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/auth/verify-registration", {
      email: email.trim(),
      code: code.trim(),
      role: "patient",
    });
    return data;
  },

  async resendRegistrationOtp(email: string): Promise<RegistrationPendingResponse> {
    const { data } = await api.post<RegistrationPendingResponse>("/auth/resend-registration-otp", {
      email: email.trim(),
      role: "patient",
    });
    return data;
  },

  async googleOAuth(params: {
    email: string;
    full_name: string;
    google_id?: string;
  }): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/auth/oauth/google", params);
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<BackendUser>("/users/me");
    if (data.preferred_language) {
      const { useLanguageStore } = await import("@/store/language-store");
      useLanguageStore.getState().syncFromProfile(data.preferred_language);
    }
    return adaptUser(data);
  },

  async updateMe(params: {
    full_name?: string;
    phone?: string;
    profile_image_url?: string;
    preferred_language?: string;
  }): Promise<AuthUser> {
    const { data } = await api.put<BackendUser>("/users/me", params);
    return adaptUser(data);
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

  async logoutEverywhere(): Promise<void> {
    await api.post("/auth/logout-everywhere");
  },

  async requestDataExport(): Promise<{ status: string; message: string }> {
    const { data } = await api.post<{ status: string; message: string }>("/users/me/export-data");
    return data;
  },

  async deleteAccount(password: string, reason?: string): Promise<void> {
    await api.delete("/users/me", { data: { password, reason } });
  },
};
