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
}

export function adaptUser(u: BackendUser): AuthUser {
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone ?? "",
    role: u.role as AuthUser["role"],
    avatarUrl: u.profile_image_url ?? undefined,
  };
}

export const authService = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/auth/login", { email, password });
    return data;
  },

  async register(params: {
    full_name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>("/auth/register", {
      ...params,
      role: "patient",
    });
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<BackendUser>("/users/me");
    return adaptUser(data);
  },

  async updateMe(params: {
    full_name?: string;
    phone?: string;
    profile_image_url?: string;
  }): Promise<AuthUser> {
    const { data } = await api.put<BackendUser>("/users/me", params);
    return adaptUser(data);
  },
};
