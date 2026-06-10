import api from "@/lib/api";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  profile_image_url?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
    return data;
  },

  async getMe(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>("/users/me");
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
};
