import api from "@/lib/api";

export interface AdminSummary {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_pharmacies: number;
  total_riders: number;
  total_orders: number;
  completed_orders: number;
  total_prescriptions: number;
  available_revenue_net: number;
  pending_withdrawals: number;
  total_collected?: number;
  successful_payments?: number;
  awaiting_review_payments?: number;
  awaiting_review_amount?: number;
  payments_by_method?: PaymentMethodBreakdown[];
}

export interface PaymentTransactionRow {
  id: string;
  order_id: string;
  order_code?: string | null;
  amount: number;
  currency: string;
  provider: string;
  method: string;
  status: string;
  phone?: string | null;
  patient_name?: string | null;
  patient_email?: string | null;
  paid_at?: string | null;
  reviewed_at?: string | null;
  confirmed_momo_transaction_id?: string | null;
  created_at?: string | null;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  count: number;
  amount: number;
}

export interface PaymentAnalyticsSummary {
  total_collected: number;
  successful_count: number;
  awaiting_review_count: number;
  awaiting_review_amount: number;
  failed_count: number;
  by_method: PaymentMethodBreakdown[];
}

export const analyticsService = {
  async getAdminSummary(): Promise<AdminSummary> {
    const { data } = await api.get<AdminSummary>("/analytics/admin");
    return data;
  },

  async getPaymentSummary(): Promise<PaymentAnalyticsSummary> {
    const { data } = await api.get<PaymentAnalyticsSummary>("/analytics/payments/summary");
    return data;
  },

  async getPaymentTransactions(params?: {
    status?: string;
    method?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaymentTransactionRow[]> {
    const { data } = await api.get<PaymentTransactionRow[]>("/analytics/payments/transactions", {
      params,
    });
    return data;
  },
};
