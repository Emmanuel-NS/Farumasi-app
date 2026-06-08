import api from "@/lib/api";

export interface PayoutCredentials {
  configured: boolean;
  payout_method?: string | null;
  payout_account_masked?: string | null;
  payout_account_name?: string | null;
  updated_at?: string | null;
}

export interface SetPayoutCredentialsPayload {
  payout_method: string;
  payout_details: Record<string, unknown>;
  verification_code?: string;
}

export const payoutCredentialsService = {
  async get(): Promise<PayoutCredentials> {
    const { data } = await api.get<PayoutCredentials>("/sellers/me/payout-credentials");
    return data;
  },

  async sendVerification(): Promise<{ message: string; expires_in_minutes: number }> {
    const { data } = await api.post<{ message: string; expires_in_minutes: number }>(
      "/sellers/me/payout-credentials/send-verification",
    );
    return data;
  },

  async set(payload: SetPayoutCredentialsPayload): Promise<PayoutCredentials> {
    const { data } = await api.put<PayoutCredentials>("/sellers/me/payout-credentials", payload);
    return data;
  },
};
