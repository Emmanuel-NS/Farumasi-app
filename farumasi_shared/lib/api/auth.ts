import { getClient } from "./client";
import type {
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  UserOut,
} from "./types";

export const authApi = {
  register: (payload: RegisterPayload): Promise<TokenResponse> =>
    getClient().post<TokenResponse>("/auth/register", payload),

  login: async (payload: LoginPayload): Promise<TokenResponse> => {
    const client = getClient();
    const tokens = await client.post<TokenResponse>("/auth/login", payload);
    await client.setTokens(tokens);
    return tokens;
  },

  refresh: (refreshToken: string): Promise<TokenResponse> =>
    getClient().post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken }),

  me: (): Promise<UserOut> => getClient().get<UserOut>("/users/me"),

  logout: async (): Promise<void> => {
    await getClient().clearTokens();
  },
};
