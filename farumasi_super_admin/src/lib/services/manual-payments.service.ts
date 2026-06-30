import api from "@/lib/api";

export type ManualPaymentOutcome = "full" | "partial" | "delivery_deferred";

export interface OrderPaymentContext {
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  defer_delivery_fee: boolean;
  amount_paid_order: number;
  balance_due: number;
  delivery_fee_outstanding: number;
  medicines_paid: boolean;
  processing_fee_on_balance: number;
}

export interface ManualPaymentTxn {
  id: string;
  order_id: string;
  order_code?: string | null;
  amount: number;
  currency: string;
  provider: string;
  method: string;
  status: string;
  phone?: string | null;
  proof_urls: string[];
  patient_note?: string | null;
  admin_review_note?: string | null;
  patient_name?: string | null;
  patient_email?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  paid_at?: string | null;
  confirmed_momo_transaction_id?: string | null;
  created_at?: string | null;
  expected_order_amount?: number | null;
  order_amount_applied?: number | null;
  approval_outcome?: string | null;
  order_context?: OrderPaymentContext | null;
}

export interface PaymentPlatformConfig {
  manual_momo_enabled: boolean;
  manual_momo_merchant_name: string;
  manual_momo_pay_code: string;
  manual_momo_dial_template: string;
  manual_momo_instructions: string;
}

export const manualPaymentsService = {
  async list(status?: string): Promise<ManualPaymentTxn[]> {
    const { data } = await api.get<ManualPaymentTxn[]>("/admin/manual-payments", {
      params: status ? { status } : undefined,
    });
    return data;
  },

  async pendingCount(): Promise<number> {
    const { data } = await api.get<{ pending: number }>("/admin/manual-payments/pending-count");
    return data.pending;
  },

  async approve(
    txnId: string,
    payload: {
      momo_transaction_id: string;
      review_note?: string;
      outcome: ManualPaymentOutcome;
      amount_received?: number;
    },
  ): Promise<ManualPaymentTxn> {
    const { data } = await api.post<ManualPaymentTxn>(`/admin/manual-payments/${txnId}/approve`, payload);
    return data;
  },

  async reject(txnId: string, reviewNote: string): Promise<ManualPaymentTxn> {
    const { data } = await api.post<ManualPaymentTxn>(`/admin/manual-payments/${txnId}/reject`, {
      review_note: reviewNote,
    });
    return data;
  },

  async getPaymentConfig(): Promise<PaymentPlatformConfig> {
    const { data } = await api.get<PaymentPlatformConfig>("/config/payments");
    return data;
  },

  async updatePaymentConfig(patch: Partial<PaymentPlatformConfig>): Promise<PaymentPlatformConfig> {
    const { data } = await api.put<PaymentPlatformConfig>("/config/payments", patch);
    return data;
  },
};
