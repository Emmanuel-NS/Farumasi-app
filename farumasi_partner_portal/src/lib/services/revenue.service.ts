import api from "@/lib/api";

export interface BackendRevenueRecord {
  id: string;
  order_id: string;
  partner_type: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  gross_amount: number;
  platform_commission: number;
  net_amount: number;
  status: string;
  created_at: string;
}

export interface BackendRevenueSummary {
  total_gross: number;
  total_commission: number;
  total_net: number;
  available_balance: number;
  pending_balance: number;
  withdrawn_total: number;
  gross_revenue: number;
  platform_commission: number;
  net_revenue: number;
  withdrawn_amount: number;
  pending_withdrawals: number;
  paid_withdrawals: number;
  total_orders: number;
  completed_orders: number;
}

export interface BackendWithdrawal {
  id: string;
  requester_user_id: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  amount: number;
  payout_method: string;
  payout_details?: Record<string, unknown> | null;
  status: "pending" | "processing" | "completed" | "rejected";
  admin_notes?: string | null;
  processed_by_user_id?: string | null;
  created_at: string;
  processed_at?: string | null;
}

export interface WithdrawalCreatePayload {
  amount: number;
  payout_method: string;
  payout_details?: Record<string, unknown> | null;
}

export const revenueService = {
  async getSummary(): Promise<BackendRevenueSummary> {
    const { data } = await api.get<BackendRevenueSummary>("/partners/me/revenue/summary");
    return data;
  },

  async listTransactions(): Promise<BackendRevenueRecord[]> {
    const { data } = await api.get<BackendRevenueRecord[]>("/partners/me/revenue");
    return data;
  },

  async listWithdrawals(): Promise<BackendWithdrawal[]> {
    const { data } = await api.get<BackendWithdrawal[]>("/partners/me/withdrawals");
    return data;
  },

  async requestWithdrawal(payload: WithdrawalCreatePayload): Promise<BackendWithdrawal> {
    const { data } = await api.post<BackendWithdrawal>("/partners/me/withdrawals", payload);
    return data;
  },
};
