import api, { TOKEN_KEY } from "@/lib/api";

export interface LoginResponse {
  requires_2fa?: boolean;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  must_change_password?: boolean;
  pending_token?: string;
  expires_minutes?: number;
  message?: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  email: string;
}

export interface MeUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
  two_factor_enabled?: boolean;
}

export function getApiError(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const ax = err as { response?: { data?: { detail?: string } }; message?: string; code?: string };
    if (ax.response?.data?.detail) return String(ax.response.data.detail);
    if (ax.code === "ERR_NETWORK" || ax.message?.includes("Network Error")) {
      if (!ax.response) {
        return "Cannot reach the API. Start the backend on http://localhost:8000";
      }
    }
  }
  return fallback;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
    const { data } = await api.post<LoginResponse>("/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });
    return data;
  },

  async getMe(): Promise<MeUser> {
    const { data } = await api.get<MeUser>("/users/me");
    return data;
  },

  async forgotPassword(email: string): Promise<{ status: string; message: string }> {
    const { data } = await api.post<{ status: string; message: string }>("/auth/forgot-password", {
      email: email.trim().toLowerCase(),
    });
    return data;
  },

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ status: string; message: string }> {
    const { data } = await api.post<{ status: string; message: string }>("/auth/reset-password", {
      email: email.trim().toLowerCase(),
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

  async getTwoFactorStatus(): Promise<TwoFactorStatus> {
    const { data } = await api.get<TwoFactorStatus>("/auth/2fa/status");
    return data;
  },

  async sendTwoFactorSetupCode(): Promise<{ message: string; expires_minutes: number }> {
    const { data } = await api.post<{ message: string; expires_minutes: number }>(
      "/auth/2fa/send-setup-code",
    );
    return data;
  },

  async enableTwoFactor(code: string): Promise<TwoFactorStatus> {
    const { data } = await api.post<TwoFactorStatus>("/auth/2fa/enable", { code: code.trim() });
    return data;
  },

  async sendTwoFactorDisableCode(): Promise<{ message: string; expires_minutes: number }> {
    const { data } = await api.post<{ message: string; expires_minutes: number }>(
      "/auth/2fa/send-disable-code",
    );
    return data;
  },

  async disableTwoFactor(password: string, code: string): Promise<TwoFactorStatus> {
    const { data } = await api.post<TwoFactorStatus>("/auth/2fa/disable", {
      password,
      code: code.trim(),
    });
    return data;
  },

  async verifyTwoFactorLogin(pendingToken: string, code: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/2fa/verify-login", {
      pending_token: pendingToken,
      code: code.trim(),
    });
    return data;
  },

  async resendTwoFactorLogin(pendingToken: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>("/auth/2fa/resend-login", {
      pending_token: pendingToken,
    });
    return data;
  },
};
