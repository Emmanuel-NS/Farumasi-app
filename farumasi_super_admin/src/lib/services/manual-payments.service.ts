import api from "@/lib/api";

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

  async approve(txnId: string, momoTransactionId: string, reviewNote?: string): Promise<ManualPaymentTxn> {
    const { data } = await api.post<ManualPaymentTxn>(`/admin/manual-payments/${txnId}/approve`, {
      momo_transaction_id: momoTransactionId,
      review_note: reviewNote,
    });
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
