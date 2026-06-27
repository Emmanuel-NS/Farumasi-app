import api from "@/lib/api";
import { getSellerMeBase } from "@/lib/seller-api";
import { coerceAmount, normalizeRevenueRecord, normalizeRevenueSummary } from "@/lib/revenue-utils";

export interface BackendRevenueRecord {
  id: string;
  order_id: string;
  order_code?: string | null;
  order_status?: string | null;
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
  reassigned_orders?: number;
  reassigned_lost_net?: number;
}

export interface BackendWithdrawal {
  id: string;
  requester_user_id: string;
  pharmacy_id?: string | null;
  partner_company_id?: string | null;
  amount: number;
  payout_method: string;
  payout_details?: Record<string, unknown> | null;
  status: "pending" | "approved" | "processing" | "paid" | "completed" | "rejected";
  admin_notes?: string | null;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
  processed_at?: string | null;
  created_at: string;
}

export interface WithdrawalCreatePayload {
  amount: number;
}

export const revenueService = {
  async getSummary(): Promise<BackendRevenueSummary> {
    const { data } = await api.get<BackendRevenueSummary>(`${getSellerMeBase()}/revenue/summary`);
    return normalizeRevenueSummary(data);
  },

  async listTransactions(): Promise<BackendRevenueRecord[]> {
    const { data } = await api.get<BackendRevenueRecord[]>(`${getSellerMeBase()}/revenue`);
    return data.map(normalizeRevenueRecord);
  },

  async listWithdrawals(): Promise<BackendWithdrawal[]> {
    const { data } = await api.get<BackendWithdrawal[]>(`${getSellerMeBase()}/withdrawals`);
    return data.map((w) => ({ ...w, amount: coerceAmount(w.amount) }));
  },

  async requestWithdrawal(payload: WithdrawalCreatePayload): Promise<BackendWithdrawal> {
    const { data } = await api.post<BackendWithdrawal>(`${getSellerMeBase()}/withdrawals`, payload);
    return data;
  },
};
