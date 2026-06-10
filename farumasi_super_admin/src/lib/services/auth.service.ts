import api, { TOKEN_KEY } from "@/lib/api";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string | null;
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
};
